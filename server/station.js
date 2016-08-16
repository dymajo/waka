var fs = require('fs')
var request = require('request')
var moment = require('moment-timezone')

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

        var filteredTrips = []
        var trips = JSON.parse(body).response
        trips.forEach(function(trip) {
          if (trip.arrival_time_seconds < (currentTime + 7200) && trip.arrival_time_seconds > (currentTime - 1200)) {
            filteredTrips.push({
              trip_id: trip.trip_id,
              arrival_time: trip.arrival_time,
              stop_sequence: trip.stop_sequence
            })
          }
        })

        var sending = JSON.parse(JSON.stringify(station.stops[req.params.station]))
        sending.currentTime = currentTime
        sending.trips = filteredTrips
        
        res.send(sending)
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