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
    req.params.station = req.params.station.trim()
    if (req.params.station) {
      var sending = {}
      tableSvc.retrieveEntity('stops', 'allstops', req.params.station, function(err, result, response) {
        if (err) {
          return reject(err)
        }
        sending.stop_name = result.stop_name._
        sending.stop_lat = result.stop_lat._
        sending.stop_lon = result.stop_lon._
        res.send(sending)
      })
    } else {
      res.send({
        'error': 'please specify a station'
      })
    }
  },
  stopTimes: function(req, res) {
    req.params.station = req.params.station.trim()
    if (req.params.station) {
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
        if (maxTrips > 75) {
          maxTrips = 75
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

        tableSvc.queryEntities('trips',query, null, function(error, result, response) {
          var today = moment().tz('Pacific/Auckland')

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

            // check end date
            if (moment.tz(trip.end_date._, 'Pacific/Auckland').isBefore(today)) {
              console.log('deleting:', trip.RowKey._)
            }
          })
          sending.trips = finalTripsArray
          res.send(sending)

          // if greater than 2 days
          // going to move this somewhere else
          /* 
          if (new Date().getTime() - result.entries[0].Timestamp._.getTime() > 86400000*2) {
            console.log('getting the cache')
            cache.get(function() {
              console.log('uploading the cache')
              cache.upload()
            })
          }
          */
        })
      })

    } else {
      res.send({
        'error': 'please specify a station'
      })
    }
  }
}
module.exports = station