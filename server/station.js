var fs = require('fs')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')

var tableSvc = azure.createTableService()

var options = {
  url: 'https://api.at.govt.nz/v2/gtfs/stopTimes/stopId/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
};

var station = {
  api: function(req, res) {
    if (req.params.station) {
      options.url += req.params.station
      var promises = []
      var sending = {}

      // hit azure, asking for the stop info
      promises[0] = new Promise(function(resolve, reject) {
        tableSvc.retrieveEntity('stops', 'allstops', req.params.station, function(err, result, response) {
          if (err) {
            return reject(err)
          }
          sending.stop_name = result.stop_name._
          sending.stop_lat = result.stop_lat._
          sending.stop_lon = result.stop_lon._
          resolve()
        })
      })

      // hit the AT API, asking for trips in the current time
      promises[1] = new Promise(function(resolve, reject) {
        request(options, function(err, response, body) {
          if (err) {
            return reject(err)
          }

          var time = moment().tz('Pacific/Auckland')
          var currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute())).getTime()/1000

          var query = new azure.TableQuery()

          var filteredTrips = {}
          var filteredTripsLength = 0
          var trips = JSON.parse(body).response
          trips.forEach(function(trip) {
            if (trip.arrival_time_seconds < (currentTime + 7200) && trip.arrival_time_seconds > (currentTime - 1200)) {
              
              if (filteredTripsLength === 0) {
                query.where('RowKey eq ?', trip.trip_id)
              } else {
                query.or('RowKey eq ?', trip.trip_id)
              }

              filteredTrips[trip.trip_id] = {
                arrival_time: trip.arrival_time,
                stop_sequence: trip.stop_sequence
              }
              filteredTripsLength++
            }
          })

          sending.currentTime = currentTime
          
          tableSvc.queryEntities('trips',query, null, function(error, result, response) {
            if (error) throw error
            // query was successful
            result.entries.forEach(function(trip) {
              var k = trip.RowKey._
              filteredTrips[k].route_long_name = trip.route_long_name._
              filteredTrips[k].agency_id = trip.agency_id._
              filteredTrips[k].direction_id = trip.direction_id._
              filteredTrips[k].end_date = trip.end_date._
              filteredTrips[k].frequency = trip.frequency._
              filteredTrips[k].route_short_name = trip.route_short_name._
              filteredTrips[k].route_type = trip.route_type._
              filteredTrips[k].start_date = trip.start_date._
              filteredTrips[k].trip_headsign = trip.trip_headsign._
            })

            sending.trips = filteredTrips
            resolve()
          })          
        })
      })
      
      Promise.all(promises).then(function() {
        res.send(sending)
      })
      
      
    } else {
      res.send({
        'error': 'please specify a station'
      })
    }
  }
}
module.exports = station