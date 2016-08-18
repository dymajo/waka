var fs = require('fs')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')

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
          if (error) throw error
          // query was successful
          var finalTripsArray = []
          result.entries.forEach(function(trip) {
            // TODO: Only push the ones that are available today!
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
          })
          sending.trips = finalTripsArray
          res.send(sending)
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