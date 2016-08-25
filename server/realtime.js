var request = require('request')

var tripUpdatesOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

var realtime = {
	getTrips: function(req, res) {
		if (!req.body.trips) {
			res.send({
				message: 'please send trips'
			})
		}

		// i feel like we should sanatize this or something...
		var newOpts = JSON.parse(JSON.stringify(tripUpdatesOptions))
    newOpts.url += '?tripid=' + req.body.trips.join(',')
    request(newOpts, function(err, response, body) {
      if (err) {
      	res.send({
      		error: err
      	})
      	return
      }
      body = JSON.parse(body)
      var sending = {}
      if (body.response.entity) {
        body.response.entity.forEach(function(trip) {
          var timeUpdate = trip.trip_update.stop_time_update.departure || trip.trip_update.stop_time_update.arrival || {}
          sending[trip.trip_update.trip.trip_id] = {
            stop_sequence: trip.trip_update.stop_time_update.stop_sequence,
            delay: timeUpdate.delay,
            timestamp: timeUpdate.time
          }
        })
      }
      res.send(sending)	
    })
	}	
}
module.exports = realtime