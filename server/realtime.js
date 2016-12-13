var request = require('request')

var tripUpdatesOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}
var vehicleLocationsOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/vehiclelocations',
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
    var realtimeInfo = {}
    req.body.trips.forEach(function(trip) {
      realtimeInfo[trip] = {}
    })
    //console.log(realtimeInfo)
      var newOpts
      if (req.body.train) {
        newOpts = JSON.parse(JSON.stringify(vehicleLocationsOptions))
      } else {
        newOpts = JSON.parse(JSON.stringify(tripUpdatesOptions))
      }
      // i feel like we should sanatize this or something...
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
        if (body.response.entity) {
          if (req.body.train) {
            var fix = function(lat, lon) {
              lat = lat*1.66 + 23.7564;
              lon = lon*1.66 - 114.8370;
      
              if (lat < -37.091) {
                  lat += 0.6639;
              }
              return [lat, lon]
            }

            body.response.entity.forEach(function(trip) {
              var latlon = fix(trip.vehicle.position.latitude, trip.vehicle.position.longitude)
              sending[trip.vehicle.trip.trip_id] = {
                v_id: trip.vehicle.vehicle.id,
                latitude: latlon[0],
                longitude: latlon[1],
                bearing: trip.vehicle.position.bearing
              }
            })
          } else {
            console.log('getting realtime')
            body.response.entity.forEach(function(trip) {
              var timeUpdate = trip.trip_update.stop_time_update.departure || trip.trip_update.stop_time_update.arrival || {}
              realtimeInfo[trip.trip_update.trip.trip_id] = {
                stop_sequence: trip.trip_update.stop_time_update.stop_sequence,
                delay: timeUpdate.delay,
                timestamp: timeUpdate.time,
                v_id: trip.trip_update.vehicle.id,
                double_decker: isDoubleDecker(trip.trip_update.vehicle.id)
              }
            })
          }
        }
        res.send(realtimeInfo) // ???
      })
  },
  getVehicleLocation: function(req, res) {
    var vehicleInfo = {}
    req.body.trips.forEach(function(trip) {
      vehicleInfo[trip] = {}
    })
    newOpts = JSON.parse(JSON.stringify(vehicleLocationsOptions))
        newOpts.url += '?tripid=' + req.body.trips.join(',')
        request(newOpts, function(err, response, body){
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
          if (body.response.entity){
            //console.log('1', body.response.entity)
            console.log('getting vehiclelocations')
            body.response.entity.forEach(function(trip) {    
              vehicleInfo[trip.vehicle.trip.trip_id] = {
                latitude: trip.vehicle.position.latitude,
                longitude: trip.vehicle.position.longitude,
                bearing: trip.vehicle.position.bearing,
              }
              console.log(vehicleInfo[trip.vehicle.trip.trip_id])
            })
          }
        res.send(vehicleInfo)
        })
        
  }
}
module.exports = realtime