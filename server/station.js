var fs = require('fs')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')
var cache = require('./cache')

var tableSvc = azure.createTableService()
tableSvc.createTableIfNotExists('stoptimes', function(error, result, response) {
  if (error) throw error
})

var options = {
  url: 'https://api.at.govt.nz/v2/gtfs/stopTimes/stopId/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
};

// THE CALENDAR EXCEPTION CACHE //
// NOT THE GREATEST, BUT LESS EFFORT THAN USING A PROPER CACHE //
var exceptionCache = {
  updated: null,
  additions: [],
  deletions: [],
  existsToday: function(today, frequency, service) {
    if (exceptionCache.deletions.indexOf(service) != -1) {
      return false
    }
    if (exceptionCache.additions.indexOf(service) != -1) {
      return true
    }
    if (parseInt(frequency[(today+6) % 7]) === 1) {
      return true
    }
    return false
  },
  refresh: function(today, frequency, service) {
    var time = moment().tz('Pacific/Auckland')
    var y = time.year()
    var m = time.month()
    var d = time.date()
    var today = moment(Date.UTC(y, m, d, 0, 0))
    // fix for late night services
    if (time.hour() < 5) { 
      today.day(today.day()-1)
    }
    if (exceptionCache.updated !== today.toISOString()) {
      var adding = []
      var deleting = []
      var dateQuery = function(query, continuationToken, callback) {
        tableSvc.queryEntities('calendardate', query, continuationToken, function(err, result, response) {
          if (err) {
            return console.log(err)
          }
          result.entries.forEach(function(item) {
            if (item.exception_type._ === 1) {
              adding.push(item.RowKey._)  
            } else if (item.exception_type._ === 2) {
              deleting.push(item.RowKey._)
            }
          })
          if (result.continuationToken) {
            dateQuery(query, result.continuationToken, callback)
          } else {
            callback()
          }
        })
      }
      dateQuery(new azure.TableQuery().where('PartitionKey eq ?', today.toISOString()), null, function(message) {
        exceptionCache.additions = adding
        exceptionCache.deletions = deleting
        exceptionCache.updated = today.toISOString()
      })
    }
  }
}

var station = {
  getStopsLatLong(req, res) {
    // no caching here, maybe we need it?
    if (req.query.lat && req.query.lng && req.query.distance) {
      // limit of the distance value
      if (req.query.distance > 1250) {
        return res.status(400).send({
          'error': 'too many stops sorry'
        })
      }

      var lat = parseFloat(req.query.lat)
      var lng = parseFloat(req.query.lng)
      // var latDist = req.query.distance / 165000
      var latDist = req.query.distance / 100000
      var lngDist = req.query.distance / 65000

      var query = new azure.TableQuery()
          .where('stop_lat > ? and stop_lat < ?', lat - latDist, lat + latDist)
          .and('stop_lon > ? and stop_lon < ?', lng -  lngDist, lng + lngDist)

      tableSvc.queryEntities('stops', query, null, function(err, result, response) {
        var stops = []
        result.entries.forEach(function(stop) {
          if (stop.location_type._ === 0) {
            stops.push({
              stop_id: stop.RowKey._,
              stop_name: stop.stop_name._,
              stop_lat: stop.stop_lat._,
              stop_lng: stop.stop_lon._ // wtf why isn't this consistent
            })
          }
        })
        res.send(stops)
      })
    } else {
      res.status(400).send({
        'message': 'please send all required params (lat, lng, distance)'
      })
    }
  },
  cacheCheck(stop) {
    tableSvc.retrieveEntity('meta', 'stoptimes', stop, function(err, result, response) {
      if (err) {
        if (err.statusCode === 404) {
          // this is mainly to upgrade the database to not break deprecation, so we set last updated to a day ago
          var date = new Date() 
          date.setDate(date.getDate() - 1);
          var task = {
            PartitionKey: {'_': 'stoptimes'},
            RowKey: {'_': stop.toString()},
            date: {'_': date, '$':'Edm.DateTime'}
          }
          tableSvc.insertOrReplaceEntity('meta', task, function (error, result, response) {
            if (error) {
              console.log(error)
            }
            console.log(`saved temp stoptimes date for ${stop}`)
          })
        } else {
          console.log(err)
        }
        return
      }
      if(new Date().getTime() - result.date._.getTime() > 86400000) {
        // if it was last updated a day ago, redo the caches
        console.log(`refreshing stop: ${stop}`)
        station.getTripsFromAt(stop)
      }
    })
  },
  // ok whytf did i use station as the variable name ???
  getTripsFromAt(station, cb) {
    // we have to go the AT API and store this data
    var newOpts = JSON.parse(JSON.stringify(options))
    newOpts.url += station
    request(newOpts, function(err, response, body) {
      if (err) return cb(err)

      var time = moment().tz('Pacific/Auckland')
      var currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute())).getTime()/1000

      var trips = JSON.parse(body).response
      var filteredTrips = []
      var arrayOfEntityArrays = []
      var count = 0
      trips.forEach(function(trip) {
        arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
        if (arrayOfEntityArrays[count].operations.length > 99) {
          count++
          arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
        }
        // midnight fix?
        trip.arrival_time_seconds = trip.arrival_time_seconds % 86400

        // for the azure batch
        arrayOfEntityArrays[count].insertOrReplaceEntity({
          PartitionKey: {'_': station},
          RowKey: {'_': trip.trip_id},
          arrival_time_seconds: {'_': trip.arrival_time_seconds},
          stop_sequence: {'_': trip.stop_sequence}
        })

        // filter for the immediate return because we do it in a query on the db side
        if (trip.arrival_time_seconds < (currentTime + 7200) && trip.arrival_time_seconds > (currentTime - 1200)) {
          // this is for the normal at return
          filteredTrips.push({
            trip_id: trip.trip_id,
            arrival_time_seconds: trip.arrival_time_seconds,
            stop_sequence: trip.stop_sequence
          })
        }
      })

      // save the filtered trips from at
      var batchUpload = function(n) {
        if (n < arrayOfEntityArrays.length) {
          //console.log(`uploading stoptimes for ${station} batch ${n+1}`)
          tableSvc.executeBatch('stoptimes', arrayOfEntityArrays[n], function (error, result, response) {
            if(!error) {
              batchUpload(n+1)
            } else {
              console.log(error)
            }
          });
        } else {
          console.log(`finished uploading stoptimes for ${station}`)

          var task = {
            PartitionKey: {'_': 'stoptimes'},
            RowKey: {'_': station.toString()},
            date: {'_':new Date(), '$':'Edm.DateTime'}
          }
          tableSvc.insertOrReplaceEntity('meta', task, function (error, result, response) {
            if (error) {
              console.log(error)
            }
            console.log(`saved new stoptimes date for ${station}`)
          })
        }
      }

      batchUpload(0)

      // only run the cb if requested
      if (cb) cb(null, filteredTrips)
    })
  },
  stopInfo: function(req, res) {
    if (req.params.station) {
      req.params.station = req.params.station.trim()
      var sending = {}
      tableSvc.retrieveEntity('stops', 'allstops', req.params.station, function(err, result, response) {
        if (err) {
          return res.status(404).send({
            'error': 'station not found'
          })
        }
        sending.stop_name = result.stop_name._
        sending.stop_lat = result.stop_lat._
        sending.stop_lon = result.stop_lon._
        res.send(sending)
      })
    } else {
      res.status(404).send({
        'error': 'please specify a station'
      })
    }
  },
  stopTimes: function(req, res, force) {
    exceptionCache.refresh()

    if (req.params.force) {
      force = true
    }
    if (req.params.station) {
      req.params.station = req.params.station.trim()
      var sending = {}

      // ask for trips in real time
      var promise = new Promise(function(resolve, reject) {
        // we going to query the things
        var time = moment().tz('Pacific/Auckland')
        var currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute())).getTime()/1000
        var query = new azure.TableQuery()
          .where('PartitionKey eq ?', req.params.station)
          .and('arrival_time_seconds < ? and arrival_time_seconds > ?', currentTime + 7200, currentTime - 1200)
        sending.currentTime = currentTime

        // force get update
        if (force === true) {
          console.log('forcing update ')
          station.getTripsFromAt(req.params.station, function(err, data) {
            sending.provider = 'at' // just for debugging purposes
            sending.trips = data
            resolve()
          })
          return 
        }

        // if azure can't get it, ask AT
        tableSvc.queryEntities('stoptimes', query, null, function(err, result, response) {
          if (err) {
            return reject(err)
          }
          // TODO: Fix this
          // Side Effect of this, stations that have no more stops for a night, will init a call to the AT API
          if (result.entries.length === 0 || req.query.debug) {
            tableSvc.retrieveEntity('meta', 'stoptimes', req.params.station, function(err, result, response) {
              if (err) {
                // checks if it exists at all, if not grab the latest data
                if (err.statusCode === 404) {
                  console.log('getting trips for the first time for', req.params.station)
                  station.getTripsFromAt(req.params.station, function(err, data) {
                    sending.provider = 'at' // just for debugging purposes
                    sending.trips = data
                    resolve()
                  })
                } else {
                  console.log(err)
                }
              } else {
                // nope there were just no stoptimes
                sending.provider = 'azure'
                sending.trips = []
                resolve()

                station.cacheCheck(req.params.station)
              }
            });
          } else {
            var data = []
            result.entries.forEach(function(trip) {
              data.push({
                trip_id: trip.RowKey._,
                arrival_time_seconds: trip.arrival_time_seconds._,
                stop_sequence: trip.stop_sequence._
              })
            })
            sending.provider = 'azure' // just for debugging purposes
            sending.trips = data
            resolve()

            station.cacheCheck(req.params.station)  
          }         
        })
      }).then(function() {

        var sortByTime = function(a, b) {
          return a.arrival_time_seconds - b.arrival_time_seconds
        }
        sending.trips.sort(sortByTime)

        // only sending 200 trips back :/ or is that too many?
        var maxTrips = sending.trips.length
        if (maxTrips > 150) {         
          maxTrips = 150
        }        

        // if there are no trips, don't do a query duh
        if (maxTrips === 0) {
          sending.trips = {}
          res.send(sending)
          return
        }

        var time = moment().tz('Pacific/Auckland')
        var y = time.year()
        var m = time.month()
        var d = time.date()
        var today = moment(Date.UTC(y, m, d, 0, 0)).add(1, 'minute')
        var tomorrow = moment(Date.UTC(y, m, d, 0, 0)).add(1, 'day').add(1, 'minute')

        // >5am override (nite rider)
        if (time.hour() < 5) {
          today.day(today.day()-1)
        }

        var tmpTripStore = {}
        var tripPartitionQueue = {}
        var tripQueryPromises = []
        var finalTripsArray = []
        var deleteCount = 0

        var getTrip = function(queue, index, callback) {
          // finished
          if (index === queue.length) {
            return callback()
          }
          var partitionKey = queue[index].trip_id.split('_').slice(-1)[0]
          tableSvc.retrieveEntity('trips', partitionKey, queue[index].trip_id, function(error, trip, response) {
            if (error) {
              // ignore not found trips
              if (error.statusCode != 404) {
                // fail if needed, but still resolve
                console.log(error)
              }
              return getTrip(queue, index+1, callback)
            }

            // check day of week
            if (exceptionCache.existsToday(today.day(), trip.frequency._, trip.service_id._) &&
              // check end date
              moment(trip.end_date._).isAfter(tomorrow) &&
              // check start date
              moment(trip.start_date._).isBefore(today)
              ) {
              
              // TODO: Only push the ones that haven't already ended
              finalTripsArray.push({
                arrival_time_seconds: tmpTripStore[trip.RowKey._].a,
                stop_sequence: tmpTripStore[trip.RowKey._].s,
                trip_id: trip.RowKey._,
                route_long_name: trip.route_long_name._,
                agency_id: trip.agency_id._,
                direction_id: trip.direction_id._,
                end_date: trip.end_date._,
                frequency: trip.frequency._,
                route_short_name: trip.route_short_name._,
                route_type: trip.route_type._,
                start_date: trip.start_date._,
                trip_headsign: trip.trip_headsign._
              })
            // check end date & delete if expired
            // we don't have to batch because 75 is max
            } else if (moment(trip.start_date._).isBefore(today) && tomorrow.isAfter(moment(trip.end_date._))) {
              deleteCount++
            }

            // should have all gone well :)
            return getTrip(queue, index+1, callback)
          })
        }

        var maxLength = 5
        var partitionCount = 0
        tripPartitionQueue[0] = []

        // divides the trips into partitions
        for (var i=0; i<maxTrips; i++) {
          tmpTripStore[sending.trips[i].trip_id] = {a: sending.trips[i].arrival_time_seconds, s: sending.trips[i].stop_sequence}

          // adds partitioned thing to queue
          if (tripPartitionQueue[partitionCount].length > maxLength) {
            partitionCount++
            tripPartitionQueue[partitionCount] = []
          }
          tripPartitionQueue[partitionCount].push(sending.trips[i])  
          
        }

        for (var key in tripPartitionQueue) {
          tripQueryPromises.push(new Promise(function(resolve, reject) {
            try {
              getTrip(tripPartitionQueue[key], 0, function() {
                resolve()
              })
            } catch(err) {
              console.log(err)
            }
            
          }))
        }

        Promise.all(tripQueryPromises).then(function() {
          sending.trips = finalTripsArray

          // forces a cache update
          if (sending.trips.length === 0 && deleteCount > 0 && force !== true) {
            station.stopTimes(req, res, true)
            return  
          }
          
          // send
          res.send(sending)

          // otherwise just a normal delete
          if (deleteCount > 0) {
            console.log('deletion should be run')
             station.clean(req.params.station)
          }
        })

      }, function(error) {
        res.status(404).send({
          'error': 'please specify a station'
        })
      })

    } else {
      res.status(404).send({
        'error': 'please specify a station'
      })
    }
  },
  /* 
  This is crazy long, and all it does is cleans the trips for all routes at a stop.
  Needs a refactor. To the days. Help.
  */
  clean: function(station) {
    var allRows = []
    var deleteCandidates = []
    var deleteStopCandidates = []

    var stopQuery = function(query, continuationToken, callback) {
      tableSvc.queryEntities('stoptimes', query, continuationToken, function(err, result, response) {
        if (err) {
          return console.log(err)
        }
        result.entries.forEach(function(trip) {
          allRows.push(trip.RowKey._)
        })
        if (result.continuationToken) {
          stopQuery(query, result.continuationToken, callback)
        } else {
          callback()
        }
      })
    }

    var stopDeleteQuery = function(query, callback) {
      tableSvc.queryEntities('stoptimes', query, null, function(err, result, response) {
        if (err) {
          return console.log(err)
        }
        result.entries.forEach(function(trip) {
          deleteStopCandidates.push([trip.PartitionKey._, trip.RowKey._])
        })
        callback()
      })
    }

    var tripQuery = function(query, callback) {
      tableSvc.queryEntities('trips', query, null, function(err, result, response) {
        if (err) {
          return console.log(err)
        }
        var time = moment().tz('Pacific/Auckland')
        var y = time.year()
        var m = time.month()
        var d = time.date()
        var today = moment(Date.UTC(y, m, d, 0, 0)).subtract(1, 'minute')
        result.entries.forEach(function(trip) {
          var index = allRows.indexOf(trip.RowKey._)
          if (index > -1) {
            allRows.splice(index, 1)
          }
          if (moment(trip.end_date._).isBefore(today)) {
            deleteCandidates.push(trip.RowKey._)
          }
        })
        callback()
      })
    }

    stopQuery(new azure.TableQuery().where('PartitionKey eq ?', station), null, function(message) {
      // we got all the trips for a stop
      console.log('trips found at '+station+':', allRows.length)

      var promises = []
      // we're going to query in parallel
      for (var i=0; i<allRows.length; i+=100) {
        var max = i + 100
        if (max > allRows.length) {
          max = allRows.length
        }
        // assemble our query
        var query = new azure.TableQuery().select(['RowKey', 'end_date']).where('RowKey eq ?', allRows[i])
        // query.and('RowKey eq ?', allRows[i])
        for (var j=i+1; j<max; j++) {
          query.or('RowKey eq ?', allRows[j])
        }
        promises.push(new Promise(function(resolve, reject) {
          tripQuery(query, resolve)
        }))
      }

      Promise.all(promises).then(function() {
        // Here's something weird: the query doesn't always work. 
        // Why? Who knows. It just doesn't return all rows some time.
        // Makes you think, but it doesn't really matter. It'll be collected at some point hmmm.
        console.log('trips to delete:', deleteCandidates.length)

        // THIS MIGHT BE DANGEROUS...
        // console.log('trips to delete:', deleteCandidates.length + '(expired) +', allRows.length + '(not found)')
        // deleteCandidates = deleteCandidates.concat(allRows)

        // This is a mega nightmare process.
        // Now we have to build a query with all of the tripId's to be deleted
        var stopPromises = []
        // we're going to query in parallel
        for (var i=0; i<deleteCandidates.length; i+=100) {
          var max = i + 100
          if (max > deleteCandidates.length) {
            max = deleteCandidates.length
          }
          // assemble our query
          var query = new azure.TableQuery().where('RowKey eq ?', deleteCandidates[i])
          // query.and('RowKey eq ?', allRows[i])
          for (var j=i+1; j<max; j++) {
            query.or('RowKey eq ?', deleteCandidates[j])
          }
          stopPromises.push(new Promise(function(resolve, reject) {
            stopDeleteQuery(query, resolve)
          }))
        }
        Promise.all(stopPromises).then(function() {
          console.log('stoptimes to delete:', deleteStopCandidates.length)

          // maybe we shouldn't delete old trips? for safety? does it hurt us having them?
          // build the batch functions
          // trip batch
          // var tripBatch = []
          // var tripCount = 0
          // deleteCandidates.forEach(function(item) {
          //   tripBatch[tripCount] = tripBatch[tripCount] || new azure.TableBatch()
          //   if (tripBatch[tripCount].operations.length > 99) {
          //     tripCount++
          //     tripBatch[tripCount] = tripBatch[tripCount] || new azure.TableBatch()
          //   }
          //   tripBatch[tripCount].deleteEntity({
          //     PartitionKey: {'_': 'alltrips'},
          //     RowKey: {'_': item}
          //   })
          // })
          // console.log('trip batch ready!')

          // times batch
          var timesBatch = {}
          var timesCount = {}

          deleteStopCandidates.forEach(function(item) {
            try {
              if (typeof(timesBatch[item[0]]) === 'undefined') {
                timesBatch[item[0]] = []
                timesCount[item[0]] = 0
              }
              var b = timesBatch[item[0]]
              var c = timesCount[item[0]]

              b[c] = b[c] || new azure.TableBatch() 
              if (b[c].operations.length > 99) {
                // have to update both the copy, and the pointer
                timesCount[item[0]]++
                c++ 
                // then we can create a new batch
                b[c] = b[c] || new azure.TableBatch()
              }
              b[c].deleteEntity({
                PartitionKey: {'_': item[0]},
                RowKey: {'_': item[1]}
              })
            } catch(err) {
              console.log(err)
            }
          })

          // save the filtered trips from at
          var batchExecutor = function(name, batch, n) {
            try {
              if (n < batch.length) {
                //console.log(`deleting stoptimes for ${name} batch ${n+1}`)
                tableSvc.executeBatch('stoptimes', batch[n], function (error, result, response) {
                  if(!error) {
                    batchExecutor(name, batch, n+1)
                  } else {
                    console.log(error)
                  }
                });
              } else {
                console.log(`deleting stoptimes for ${name} complete`)
              }
            } catch(err) {
              console.log(err)
            }
          }
          
          for (var key in timesBatch) {
            batchExecutor(key, timesBatch[key], 0)
          }

        })
      })
    })
  }
}
module.exports = station