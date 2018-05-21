var request = require('request')
var cache = require('../cache')

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
  // https://fleetlists.busaustralia.com/index-nz.php
  var doubleDeckers = [
    // NZ Bus / Metrolink
    // Alexander Dennis Enviro500

    '3A99', '3A9A', '3A9B', '3A9C', '3A9D', '3A9E', '3A9F', 
    '3AA0', '3AA1', '3AA2', '3AA3', '3AA4', '3AA5', '3AA6', 
    '3AA7', '3AA8', '3AA9', '3AAA', '3AAB', '3AAC', '3AAD', 
    '3AAE', '3AAF', 
    // BCI CitiRider
    '3BC4', '3BC5', '3BC6', '3BC7', '3BC8', '3BC9', '3BCA',
    '3BCB', '3BCC', '3BCD', '3BCE', '3BCF', '3BD0', '3BD1',
    '3BD2',

    //Birkenhead Transport
    //Alexander Dennis Enviro500
    '5258', '5259', '525A', '525B', '525C', '525D',



    // Howick and Eastern
    // More Enviro500
    '5FB4', '5FB5', '5FB6', '5FB7', '5FB8', '5FB9', '5FBA',
    '5FBB', '5FBC', '5FBD', '5FBE', '5FBF', '5FC0', '5FC1',
    '5FC2',
    
    //NEX BCI CitiRider FBC6123BRZ 1050-1074
    '5622', '5623', '5624', '5625', '5626', '5627', '5628',
    '5629', '562A', '562B', '562C', '562D', '562E', '562F',
    '5630', '5631', '5632', '5633', '5634', '5635', '5636',
    '5637', '5638', '5639', '563A', 

  ]
  // uncomment this line if you want it to randomly be a double decker
  // if (Math.ceil(Math.random()*2) >1) {
  if (doubleDeckers.indexOf(vehicle) !== -1) {
    return true
  }
  return false
}

const isEV = vehicle => {
  const EVs = ['2840', '2841']

  if (EVs.indexOf(vehicle) !== -1) {
    return true
  }
  return false
}


var realtime = {
  currentData: {},
  currentDataFails: 0,
  schedulePull: function() {
    const newOpts = JSON.parse(JSON.stringify(tripUpdatesOptions))
    newOpts.url = 'https://api.at.govt.nz/v2/public/realtime/tripupdates'
    request(newOpts, function(err, response, body) {
      if (err) {
        console.warn(err)
        realtime.currentDataFails++
        setTimeout(realtime.schedulePull, 20000)
        return
      }
      try {
        body = JSON.parse(body)  
      } catch(err) {
        console.warn('rt error', err)
        realtime.currentDataFails++
        setTimeout(realtime.schedulePull, 20000)
        return
      }
      if (body.response && body.response.entity) {
        const newData = {}
        body.response.entity.forEach(function(trip) {
          newData[trip.trip_update.trip.trip_id] = trip.trip_update
        })
        realtime.currentData = newData
        realtime.currentDataFails = 0
      } else {
        console.log('could not get at data')  
      }
      setTimeout(realtime.schedulePull, 20000)
    })
  },
  getTripsEndpoint: function(req, res) {
    // compat with old version of api
    if (req.body.trips.constructor !== Array) {
      req.body.trips = Object.keys(req.body.trips)
    }

    // falls back to API if we're out of date
    if (req.body.train || realtime.currentDataFails > 3) {
      realtime.getTripsAuckland(req.body.trips, req.body.train).then((data) => {
        res.send(data)
      })
    } else {
      const rt = realtime.getTripsCachedAuckland(req.body.trips)
      res.send(rt)
    }
  },
  endpointBypass: function(req, res) {
    realtime.getTripsAuckland(req.body.trips, req.body.train).then((data) => {
      res.send(data)
    })
  },
  getTripsAuckland: function(trips, train = false) {
    var realtimeInfo = {}
    trips.forEach(function(trip) {
      realtimeInfo[trip] = {}
    })

    return new Promise((resolve, reject) => {
      var newOpts
      if (train) {
        newOpts = JSON.parse(JSON.stringify(vehicleLocationsOptions))
      } else {
        newOpts = JSON.parse(JSON.stringify(tripUpdatesOptions))
      }
    
      // i feel like we should sanatize this or something...
      newOpts.url += '?tripid=' + trips.join(',')
      request(newOpts, function(err, response, body) {
        if (err) {
          return reject(err)
        }
        try {
          body = JSON.parse(body)  
        } catch(err) {
          return reject(err)
        }
        if (body && body.response && body.response.entity) {
          if (train) {
            body.response.entity.forEach(function(trip) {
              realtimeInfo[trip.vehicle.trip.trip_id] = {
                v_id: trip.vehicle.vehicle.id,
                latitude: trip.vehicle.position.latitude,
                longitude: trip.vehicle.position.longitude,
                bearing: trip.vehicle.position.bearing
              }
            })
          } else {
            body.response.entity.forEach(function(trip) {
              var timeUpdate = trip.trip_update.stop_time_update.departure || trip.trip_update.stop_time_update.arrival || {}
              realtimeInfo[trip.trip_update.trip.trip_id] = {
                stop_sequence: trip.trip_update.stop_time_update.stop_sequence,
                delay: timeUpdate.delay,
                timestamp: timeUpdate.time,
                v_id: trip.trip_update.vehicle.id,
                double_decker: isDoubleDecker(trip.trip_update.vehicle.id),
                ev: isEV(trip.trip_update.vehicle.id),
              }
            })
          }
        }
        resolve(realtimeInfo) // ???
      })
    })
  },
  getTripsCachedAuckland: function(trips) {
    // this is essentially the same function as above, but just pulls from cache
    const realtimeInfo = {}
    trips.forEach(function(trip) {
      const data = realtime.currentData[trip]
      if (typeof(data) !== 'undefined') {
        const timeUpdate = data.stop_time_update.departure || data.stop_time_update.arrival || {}
        realtimeInfo[trip] = {
          stop_sequence: data.stop_time_update.stop_sequence,
          delay: timeUpdate.delay,
          timestamp: timeUpdate.time,
          v_id: data.vehicle.id,
          double_decker: isDoubleDecker(data.vehicle.id),
          ev: isEV(data.vehicle.id),
        }
      }
    })

    return realtimeInfo
  },
  getVehicleLocationEndpoint: function(req, res) {
    var vehicleInfo = {}
    req.body.trips.forEach(function(trip) {
      vehicleInfo[trip] = {}
    })
    const newOpts = JSON.parse(JSON.stringify(vehicleLocationsOptions))
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
        console.error('rt error', err)
        return res.send({
          error: err
        })
      }
      if (body.response.entity){
        //console.log('1', body.response.entity)
        // console.log('getting vehiclelocations')
        body.response.entity.forEach(function(trip) {    
          vehicleInfo[trip.vehicle.trip.trip_id] = {
            latitude: trip.vehicle.position.latitude,
            longitude: trip.vehicle.position.longitude,
            bearing: trip.vehicle.position.bearing,
          }
          //console.log(vehicleInfo[trip.vehicle.trip.trip_id])
        })
      }
      res.send(vehicleInfo)
    })
        
  }
}
cache.ready.push(realtime.schedulePull)
module.exports = realtime