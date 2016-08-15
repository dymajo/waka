var request = require('request')
var moment = require('moment-timezone')

var options = {
  url: 'https://api.at.govt.nz/v2/gtfs/stopTimes/stopId/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
};

var stationApi = function(req, res) {
  if (req.params.station) {
    options.url += req.params.station

    request(options, function(err, response, body) {
      if (err) throw(err)

      var time = moment().tz('Pacific/Auckland')
      var currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute())).getTime()/1000

      var filteredTrips = []
      var trips = JSON.parse(body).response
      trips.forEach(function(trip) {
        if (trip.arrival_time_seconds < (currentTime + 7200) && trip.arrival_time_seconds > (currentTime - 120)) {
          filteredTrips.push(trip)
        }
      })
      
      res.send({
        'currentTime': currentTime,
        'trips': filteredTrips
      })
    })
    
  } else {
    res.send({
      'error': 'please specify a station'
    })
  }
}
module.exports = stationApi