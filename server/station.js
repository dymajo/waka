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

var station = {
  // welp this awesome function that took me ages can't work because rate limiting :(
  getTripDataFromAt(station, cb) {
    var promises = []
    var servicesPromises = []
    var newRoutes = {}
    var newTrips = {}
    var newServices = {}

    request({
      url: 'https://api.at.govt.nz/v2/gtfs/routes/stopid/' + station,
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.atApiKey
      }
    }, function(stationErr, stationResponse, stationBody) {
      if (stationErr) return cb(stationErr)

      JSON.parse(stationBody).response.forEach(function(s) {
        newRoutes[s.route_id] = {
          agency_id: s.agency_id,
          route_short_name: s.route_short_name,
          route_long_name: s.route_long_name,
          route_type: s.route_type
        }

        // send a request getting the trips for each routes
        promises.push(new Promise(function(resolve, reject) {
          request({
            url: 'https://api.at.govt.nz/v2/gtfs/trips/routeid/' + s.route_id,
            headers: {
              'Ocp-Apim-Subscription-Key': process.env.atApiKey
            }
          }, function(tripsErr, tripsResponse, tripsBody) {
            if (tripsErr) cb(tripsErr)

            JSON.parse(tripsBody).response.forEach(function(j) {
              // a list of the services to query
              newServices[j.service_id] = j.trip_id

              // the trip list
              newTrips[j.trip_id] = {
                route_id: j.route_id,
                service_id: j.service_id,
                trip_headsign: j.trip_headsign,
                direction_id: j.direction_id,
                block_id: j.block_id,
                shape_id: j.shape_id, 
                agency_id: newRoutes[j.route_id].agency_id,
                route_short_name: newRoutes[j.route_id].route_short_name,
                route_long_name: newRoutes[j.route_id].route_long_name,
                route_type: newRoutes[j.route_id].route_type
                // frequency: services[s.service_id].frequency,
                // start_date: services[s.service_id].start_date,
                // end_date: services[s.service_id].end_date
              }
            })

            resolve()
          })
        }))
      })

      
      Promise.all(promises).then(function() {
        for (var key in newServices) {
          servicesPromises.push(new Promise(function(resolve, reject) {
            request({
              url: 'https://api.at.govt.nz/v2/gtfs/calendar/serviceId/' + key,
              headers: {
                'Ocp-Apim-Subscription-Key': process.env.atApiKey
              }
            }, function(serviceErr, serviceResponse, serviceBody) {
              if (serviceErr) cb(serviceErr)

              JSON.parse(serviceBody).response.forEach(function(s) {
                var trip = newTrips[newServices[s.service_id]]
                trip.frequency = s.monday.toString() + s.tuesday.toString() + s.wednesday.toString() + s.thursday.toString() + s.friday.toString() + s.saturday.toString() + s.sunday.toString()
                trip.start_date = s.start_date
                trip.end_date = s.end_date
              })
              resolve()
            })
          }))
        }

        // ok the thing is all assembled, now we have to upload to azure
        Promise.all(servicesPromises).then(function() {
          var batch = new azure.TableBatch();
          var arrayOfEntityArrays = []
          var count = 0
          for (var key in newTrips) {
            arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
            if (arrayOfEntityArrays[count].operations.length > 99) {
              count++
              arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch();
            } 
            arrayOfEntityArrays[count].insertOrReplaceEntity({
              PartitionKey: {'_': 'alltrips'},
              RowKey: {'_': key},
              route_id: {'_': newTrips[key].route_id},
              service_id: {'_': newTrips[key].service_id},
              trip_headsign: {'_': newTrips[key].trip_headsign},
              direction_id: {'_': newTrips[key].direction_id},
              block_id: {'_': newTrips[key].block_id},
              shape_id: {'_': newTrips[key].shape_id},
              agency_id: {'_': newTrips[key].agency_id},
              route_short_name: {'_': newTrips[key].route_short_name},
              route_long_name: {'_': newTrips[key].route_long_name},
              route_type: {'_': newTrips[key].route_type},
              frequency: {'_': newTrips[key].frequency},
              start_date: {'_': newTrips[key].start_date},
              end_date: {'_': newTrips[key].end_date}
            })
          }
          var batchUpload = function(n) {
            if (n < arrayOfEntityArrays.length) {
              console.log(`uploading trips batch ${n+1}`)
              tableSvc.executeBatch('trips', arrayOfEntityArrays[n], function (error, result, response) {
                if(!error) {
                  batchUpload(n+1)
                } else {
                  console.log(error)
                }
              });
            } else {
              console.log('finished uploading trips')
            }
          }
          batchUpload(0)
        })
      })
    })
  },
  getStopsLatLong(req, res) {
    // no caching here, maybe we need it?
    if (req.query.lat && req.query.lng && req.query.distance) {
      if (req.query.distance > 1000) {
        return res.status(400).send({
          'error': 'too many stops sorry'
        })
      }
      request({
        url: `https://api.at.govt.nz/v2/gtfs/stops/geosearch?lat=${req.query.lat}&lng=${req.query.lng}&distance=${req.query.distance}`,
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.atApiKey
        }
      }, function(err, response, body) {
        if (err) {
          return res.status(500).send(err)
        }
        var stops = []
        JSON.parse(body).response.forEach(function(stop) {
          if (stop.location_type === 0) {
            stops.push({
              stop_id: stop.stop_id,
              stop_name: stop.stop_name,
              stop_lat: stop.stop_lat,
              stop_lng: stop.stop_lon, // wtf why isn't this consistent
              location_type: stop.location_type // i don't actually think this reflects bus or train or ferry :/
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
          console.log(`uploading stoptimes for ${station} batch ${n+1}`)
          tableSvc.executeBatch('stoptimes', arrayOfEntityArrays[n], function (error, result, response) {
            if(!error) {
              batchUpload(n+1)
            } else {
              console.log(error)
            }
          });
        } else {
          console.log(`finished uploading stoptimes for ${station}`)
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
  stopTimes: function(req, res) {
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

        // if azure can't get it, ask AT
        tableSvc.queryEntities('stoptimes', query, null, function(err, result, response) {
          if (err) {
            return reject(err)
          }
          // TODO: Fix this
          // Side Effect of this, stations that have no more stops for a night, will init a call to the AT API
          if (result.entries.length === 0) {
            station.getTripsFromAt(req.params.station, function(err, data) {
              sending.provider = 'at' // just for debugging purposes
              sending.trips = data
              resolve()
            })
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

            // TODO: A cache check!
            var lastUpdated = result.entries[0].Timestamp._ // date
            // if it was last updated a day ago, redo the caches
            if(new Date().getTime() - lastUpdated.getTime() > 86400000) {
              console.log('getting stop times again', req.params.station)
              station.getTripsFromAt(req.params.station)
              // can't use because rate limits
              // station.getTripDataFromAt(req.params.station)
            }
            
          }         
        })
      }).then(function() {

        var sortByTime = function(a, b) {
          return a.arrival_time_seconds - b.arrival_time_seconds
        }
        sending.trips.sort(sortByTime)

        // only gonna send 75 trips back
        var maxTrips = sending.trips.length
        if (moment().tz('Pacific/Auckland').day() === 0) {
          // except on sunday. we send more back on sunday
          if (maxTrips > 125) {         
            maxTrips = 125
          }
        } else {
          if (maxTrips > 75) {         
            maxTrips = 75
          }
        }
        

        // if there are no trips, don't do a query duh
        if (maxTrips === 0) {
          sending.trips = {}
          res.send(sending)
          return
        }

        var tmpTripStore = {}
        var query = new azure.TableQuery()
        for (var i=0; i<maxTrips; i++) {
          if (i === 0) {
            query.where('RowKey eq ?', sending.trips[i].trip_id)
          } else {
            query.or('RowKey eq ?', sending.trips[i].trip_id)
          }
          tmpTripStore[sending.trips[i].trip_id] = {a: sending.trips[i].arrival_time_seconds, s: sending.trips[i].stop_sequence}
        }

        var deleteCount = 0
        tableSvc.queryEntities('trips',query, null, function(error, result, response) {
          var today = moment().tz('Pacific/Auckland')
          // >5am override (nite rider)
          if (today.hour() < 5) {
            today.day(today.day()-1)
          }

          if (error) throw error
          // query was successful
          var finalTripsArray = []
          result.entries.forEach(function(trip) {
            // check day of week
            if (parseInt(trip.frequency._[(today.day()+6) % 7]) === 1 &&
              // check end date
              moment.tz(trip.end_date._, 'Pacific/Auckland').isAfter(today) &&
              // check start date
              moment.tz(trip.start_date._, 'Pacific/Auckland').isBefore(today)
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
                trip_headsign: trip.trip_headsign._,
              })
            }

            // check end date & delete if expired
            // we don't have to batch because 75 is max
            if (moment.tz(trip.end_date._, 'Pacific/Auckland').isBefore(today)) {
              deleteCount++
            }
          })

          sending.trips = finalTripsArray
          res.send(sending)

          // can't do an empty batch
          if (deleteCount > 0) {
            // console.log('delete should be run', deleteCount)
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
        var today = moment().tz('Pacific/Auckland')
        result.entries.forEach(function(trip) {
          var index = allRows.indexOf(trip.RowKey._)
          if (index > -1) {
            allRows.splice(index, 1)
          }
          if (moment.tz(trip.end_date._, 'Pacific/Auckland').isBefore(today)) {
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
                console.log(`deleting stoptimes for ${name} batch ${n+1}`)
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