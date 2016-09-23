var request = require('request')

var tripUpdatesOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

var isDoubleDecker = function(vehicle) {
  // This information collected by watching Symonds Street #dedication
  var doubleDeckers = [
    // NZ Bus / Metrolink
    // Alexander Dennis Enviro500

    '3A99', '3A9A', '3A9B', '3A9C', '3A9D', '3A9E', '3A9F', 
    '3AA0', '3AA1', '3AA2', '3AA3', '3AA4', '3AA5', '3AA6', 
    '3AA7', '3AA8', '3AA9', '3AAA', '3AAB', '3AAC', '3AAD', 
    '3AAE', '3AAF', 


    // Howick and Eastern
    // More Enviro500
    '5FB4', '5FB5', '5FB6', '5FB7', '5FB8', '5FB9', '5FBA',
    '5FBB', '5FBC', '5FBD', '5FBE', '5FBF', '5FC0', '5FC1',
    '5FC2',

    //NEX BCI CityRider FBC6123BRZ
    '5622', '5623', '5624', '5625', '5626', '5627', '5628',
    '5629', '562A', '562B', '562C', '562D', '562E', '562F',
    '5630'
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