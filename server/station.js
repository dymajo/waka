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
  jsonAdditions: {},
  existsToday: function(today, frequency, service, enddate) {
    var version = service.split('-')[1]
    if (typeof(cache.versions[version]) === 'undefined') {
      // console.log(version, 'is old')
      return false
    }
    // console.log(version, enddate, cache.versions[version].enddate)

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
  refresh: function() {
    var time = moment().tz('Pacific/Auckland')
    var y = time.year()
    var m = time.month()
    var d = time.date()
    var today = moment(Date.UTC(y, m, d, 0, 0))
    // fix for late night services
    if (time.hour() < 5) { 
      today.day(today.day()-1)
    }
    if (exceptionCache.updated !== today.toISOString() || JSON.stringify(exceptionCache.jsonAdditions) === '{}') {
      var adding = []
      var deleting = []
      var dateQuery = function(query, continuationToken, callback) {
        tableSvc.queryEntities('calendardate', query, continuationToken, function(err, result, response) {
          if (err) {
            if (err.statusCode === 404) {
              return console.log('calendardate table does not exist! skipping...')
            }
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
      fs.readFile('cache/calendardate-parsed.json', function(err, data) {
        if (err) {
          console.log('calendardate-parsed.json does not exist! not using any calendar exceptions!')
          exceptionCache.jsonAdditions = {}  
          return
        }
        exceptionCache.jsonAdditions = JSON.parse(data)
      })
    }
  }
}

var station = {
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
        // TODO: update this to versions api haha
        station.getTripsFromAt(stop).then(function() {
          station.clean(stop)
        })
      }
    })
  },
  // ok whytf did i use station as the variable name ???
  getTripsFromAt(station, cb) {
    console.log(station, ': Getting New Data From AT')

    // we have to go the AT API and store this data
    var newOpts = JSON.parse(JSON.stringify(options))
    newOpts.url += station

    return new Promise(function(globalResolve, globalReject) {
      request(newOpts, function(err, response, body) {
        if (err) return cb(err)

        var time = moment().tz('Pacific/Auckland')
        var currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute())).getTime()/1000

        var promises = []
        var trips = JSON.parse(body).response
        var arrayOfEntityArrays = []
        var count = 0
        var promises = trips.map(function(trip) {
          return new Promise(function (resolve, reject) {
            // midnight fix?
            trip.arrival_time_seconds = trip.arrival_time_seconds % 86400

            var partitionKey = trip.trip_id.split('_').slice(-1)[0]
            tableSvc.retrieveEntity('trips', partitionKey, trip.trip_id, function(error, azTripData, response) {
              if (azTripData === null) {
                resolve()
                return 
              }
              arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
              if (arrayOfEntityArrays[count].operations.length > 99) {
                count++
                arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
              }
              var exceptions = [[],[],[],[],[],[],[]]
              var freq = azTripData.frequency._.split('')

              // check the bitflips
              if (typeof(exceptionCache.jsonAdditions[azTripData.service_id._]) !== 'undefined') {
                for (var i=0; i<7; i++) {
                  if (exceptionCache.jsonAdditions[azTripData.service_id._][i].length > 0) {
                    // record which bits have been flipped
                    if (freq[i] === '0') {
                      freq[i] = '1'
                      exceptions[i] = exceptionCache.jsonAdditions[azTripData.service_id._][i]
                    }
                  }
                }
              } 
              // for the azure batch
              arrayOfEntityArrays[count].insertOrReplaceEntity({
                PartitionKey: {'_': station},
                RowKey: {'_': trip.trip_id},
                arrival_time_seconds: {'_': trip.arrival_time_seconds},
                stop_sequence: {'_': trip.stop_sequence},
                start_date: azTripData.start_date,
                end_date: azTripData.end_date,
                monday: {'_': freq[0]},
                tuesday: {'_': freq[1]},
                wednesday: {'_': freq[2]},
                thursday: {'_': freq[3]},
                friday: {'_': freq[4]},
                saturday: {'_': freq[5]},
                sunday: {'_': freq[6]},
                exceptions: {'_': JSON.stringify(exceptions)}
              })
              resolve()
            })
          })
        })

        // save the filtered trips from at
        let batchUpload = function(n) {
          if (n < arrayOfEntityArrays.length) {
            tableSvc.executeBatch('stoptimes', arrayOfEntityArrays[n], function (error, result, response) {
              if(!error) {
                batchUpload(n+1)
              } else {
                console.log(error)
              }
            });
          } else {
            console.log(station, ': Upload Complete')
            globalResolve()

            let task = {
              PartitionKey: {'_': 'stoptimes'},
              RowKey: {'_': station.toString()},
              date: {'_':new Date(), '$':'Edm.DateTime'}
            }
            tableSvc.insertOrReplaceEntity('meta', task, function (error, result, response) {
              if (error) {
                console.log(error)
              }
              console.log(station, ': Metadata Updated')
            })
          }
        }

        Promise.all(promises).then(function() {
          batchUpload(0)
        })      
      })
    })
  },
  getFastDataFromAt(station, cb) {
    console.log(station, ': Getting Fast Data From AT')

    var filteredTrips = []
    var newOpts = JSON.parse(JSON.stringify(options))
    newOpts.url = 'https://api.at.govt.nz/v2/gtfs/stops/stopinfo/' + parseInt(station)
    request(newOpts, function(err, response, body) {
      if (err) return cb(err)

      var trips = JSON.parse(body).response
      trips.forEach(function(trip) {
        var depTimeSplit = trip.departure_time.split(':')
        var arrTime = parseInt(depTimeSplit[0]*3600) + parseInt(depTimeSplit[1]*60) + parseInt(depTimeSplit[2])

        filteredTrips.push({
          trip_id: trip.trip_id,
          arrival_time_seconds: arrTime,
          stop_sequence: trip.stop_sequence
        })
      })

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

    if (req.query.force) {
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
        var currentDate = moment(Date.UTC(time.year(), time.month(), time.date(), 0, 0))

        // >5am override (nite rider)
        if (time.hour() < 5) {
          currentDate.subtract(1, 'day')
        }

        var query = new azure.TableQuery()
          .where('PartitionKey eq ?', req.params.station)
          .and('arrival_time_seconds < ? and arrival_time_seconds > ?', currentTime + 7200, currentTime - 1200)
          .and('start_date <= ?', currentDate.toISOString())
          .and(currentDate.format('dddd').toLowerCase() + ' eq \'1\'')
        sending.currentTime = currentTime

        // force get update
        if (force === true) {
          console.log(req.params.station, ': Forcing Update ')
          station.getFastDataFromAt(req.params.station, function(err, data) {
            if (err) {
              res.status(500).send(err)
            }
            sending.provider = 'at' // just for debugging purposes
            sending.trips = data
            // rebuild cache async after request
            station.getTripsFromAt(req.params.station) 
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
                  console.log(req.params.station, ': New Station')
                  station.getFastDataFromAt(req.params.station, function(err, data) {
                    if (err) {
                      res.status(500).send(err)
                    }
                    sending.provider = 'at' // just for debugging purposes
                    sending.trips = data
                    // rebuild cache async after request
                    station.getTripsFromAt(req.params.station) 
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
              // checks the exception to check if the frequency was added.
              // only continue if it's supposed to be there
              var exceptions = JSON.parse(trip.exceptions._)[currentDate.isoWeekday() - 1]
              if (exceptions.length > 0) {
                if (exceptions.indexOf(currentDate.toISOString()) === -1) {
                  return
                }
              }
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
        var tomorrow = moment(Date.UTC(y, m, d, 0, 0)).subtract(1, 'minute')

        // >5am override (nite rider)
        if (time.hour() < 5) {
          today.subtract(1, 'day')
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
          // skips over if it's outdated
          var versionKey = queue[index].trip_id.split('-').slice(-1)[0]
          if (typeof(cache.versions[versionKey]) === 'undefined') {
            deleteCount += 1
            return getTrip(queue, index+1, callback)
          }
          var partitionKey = queue[index].trip_id.split('_').slice(-1)[0]
          tableSvc.retrieveEntity('trips', partitionKey, queue[index].trip_id, function(error, trip, response) {
            if (error) {
              // ignore not found trips
              if (error.statusCode != 404) {
                // fail if needed, but still resolve
                console.warn(error)
              }
              return getTrip(queue, index+1, callback)
            }

            // check day of week
            if (exceptionCache.existsToday(today.day(), trip.frequency._, trip.service_id._, trip.end_date._) &&
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
              console.warn(err)
            }
            
          }))
        }

        Promise.all(tripQueryPromises).then(function() {
          sending.trips = finalTripsArray

          // forces a cache update
          // delete count is unreliable
          if (sending.trips.length === 0 && force !== true) {
            station.stopTimes(req, res, true)
            return  
          }
          
          // send
          res.send(sending)
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
  clean: function(station)  {
    if (JSON.stringify(cache.versions) === '{}') {
      return console.log(`${station} : No version data, skipping clean.`)
    }
    console.log(`${station} : Starting Clean`)
    var allRows = []
    var deleteCandidates = []

    // this basically makes sure all the items are in there
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

    stopQuery(new azure.TableQuery().where('PartitionKey eq ?', station), null, function(message) {
      console.log(station, ': Found', allRows.length, 'Trips')
      // filters out the ones that don't need 
      allRows.forEach(function(row) {
        var version = row.split('-').slice(-1)[0]
        if (typeof(cache.versions[version]) === 'undefined') {
          deleteCandidates.push(row)
        }
      })
      console.log(station, ': Deleting', deleteCandidates.length, 'Trips')

      var timesBatch = []
      var timesCount = 0

      deleteCandidates.forEach(function(item) {
        try {
          var b = timesBatch
          var c = timesCount

          b[c] = b[c] || new azure.TableBatch() 
          if (b[c].operations.length > 99) {
            // have to update both the copy, and the pointer
            timesCount++
            c++
            // then we can create a new batch
            b[c] = b[c] || new azure.TableBatch()
          }
          b[c].deleteEntity({
            PartitionKey: {'_': station},
            RowKey: {'_': item}
          })
        } catch(err) {
          console.log(err)
        }
      })

      // delete all the trips
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
            console.log(`${name} : Deletion Complete`)
          }
        } catch(err) {
          console.log(err)
        }
      }
      
      batchExecutor(station, timesBatch, 0)
    })
  }
}
// on first run
exceptionCache.refresh()
module.exports = station