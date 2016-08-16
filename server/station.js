var fs = require('fs')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')

var tableSvc = azure.createTableService();

var options = {
  url: 'https://api.at.govt.nz/v2/gtfs/stopTimes/stopId/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
};

var station = {
  stops: {},
  init: function() {
    try {
      fs.statSync('cache/stops.json')
    } catch(err) {
      return false
    }

    fs.readFile('cache/stops.json', function(err, data) {
      if (err) throw err;

      JSON.parse(data).response.forEach(function(s) {
        station.stops[s.stop_id] = s
      })
    })
  },
  api: function(req, res) {
    if (req.params.station) {
      options.url += req.params.station
      request(options, function(err, response, body) {
        if (err) throw(err)

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

        var sending = JSON.parse(JSON.stringify(station.stops[req.params.station]))
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
          res.send(sending)
        });
        
        
      })
      
    } else {
      res.send({
        'error': 'please specify a station'
      })
    }
  }
}
station.init()
module.exports = station