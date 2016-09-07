var request = require('request')

var tripUpdatesOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

var isDoubleDecker = function(vehicle) {
  // i think we need the id of all the double deckers
  var doubleDeckers = [
    '2F6D',
    'JONO'
  ]
  // uncomment this line if you want it to randomly be a double decker
  // if (Math.ceil(Math.random()*2) >1) {
  if (doubleDeckers.indexOf(vehicle) !== -1) {
    return true
  }
  return false
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
      try {
        body = JSON.parse(body)  
      } catch(err) {
        console.log('rt error', err)
        return res.send({
          error: err
        })
      }
      var sending = {}
      if (body.response.entity) {
        body.response.entity.forEach(function(trip) {
          var timeUpdate = trip.trip_update.stop_time_update.departure || trip.trip_update.stop_time_update.arrival || {}
          sending[trip.trip_update.trip.trip_id] = {
            stop_sequence: trip.trip_update.stop_time_update.stop_sequence,
            delay: timeUpdate.delay,
            timestamp: timeUpdate.time,
            v_id: trip.trip_update.vehicle.id,
            double_decker: isDoubleDecker(trip.trip_update.vehicle.id)
          }
        })
      }
      res.send(sending)	
    })
	}	
}
module.exports = realtime