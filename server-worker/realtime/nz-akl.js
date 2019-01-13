const request = require('request')
const fetch = require('node-fetch')
const cache = require('../cache')
const sql = require('mssql')
const connection = require('../db/connection.js')
const doubleDeckers = require('./nz-akl-doubledecker.json')

const tripUpdatesOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey,
  },
}
const vehicleLocationsOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/vehiclelocations',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey,
  },
}

// https://fleetlists.busaustralia.com/index-nz.php
const isDoubleDecker = vehicle => doubleDeckers.includes(vehicle)

const EVs = ['2840', '2841']
const isEV = vehicle => EVs.includes(vehicle)

const realtime = {
  lastUpdate: null,
  lastVehicleUpdate: null,
  currentData: {},
  currentDataFails: 0,
  currentVehicleData: {},
  currentVehicleDataFails: null,

  schedulePull: function() {
    const newOpts = JSON.parse(JSON.stringify(tripUpdatesOptions))
    newOpts.url = 'https://api.at.govt.nz/v2/public/realtime/tripupdates'
    request(newOpts, (err, response, body) => {
      if (err) {
        console.warn(err)
        realtime.currentDataFails++
        setTimeout(realtime.schedulePull, 20000)
        return
      }
      try {
        body = JSON.parse(body)
      } catch (err) {
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
        realtime.lastUpdate = new Date()
      } else {
        console.log('could not get at data')
      }
      setTimeout(realtime.schedulePull, 20000)
    })
  },

  scheduleLocationPull: async () => {
    try {
      const data = await fetch(vehicleLocationsOptions.url, {
        headers: vehicleLocationsOptions.headers,
      }).then(r => r.json())
      realtime.currentVehicleData = data.response
      realtime.currentDataFails = 0
      realtime.lastVehicleUpdate = new Date()
    } catch (err) {
      realtime.currentVehicleDataFails += 1
      console.log(err)
      console.error('could not get AT data')
    }
    setTimeout(realtime.scheduleLocationPull, 15000)
  },

  getTripsEndpoint: (req, res) => {
    // compat with old version of api
    if (req.body.trips.constructor !== Array) {
      req.body.trips = Object.keys(req.body.trips)
    }

    // falls back to API if we're out of date
    if (req.body.train || realtime.currentDataFails > 3) {
      realtime.getTripsAuckland(req.body.trips, req.body.train).then(data => {
        res.send(data)
      })
    } else {
      const rt = realtime.getTripsCachedAuckland(req.body.trips)
      res.send(rt)
    }
  },
  endpointBypass: async (req, res) => {
    const { trips, train } = req.body
    const data = await realtime.getTripsAuckland(trips, train)
    res.send(data)
  },
  getTripsAuckland: (trips, train = false) => {
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
        } catch (err) {
          return reject(err)
        }
        if (body && body.response && body.response.entity) {
          if (train) {
            body.response.entity.forEach(function(trip) {
              realtimeInfo[trip.vehicle.trip.trip_id] = {
                v_id: trip.vehicle.vehicle.id,
                latitude: trip.vehicle.position.latitude,
                longitude: trip.vehicle.position.longitude,
                bearing: trip.vehicle.position.bearing,
              }
            })
          } else {
            body.response.entity.forEach(function(trip) {
              var timeUpdate =
                trip.trip_update.stop_time_update.departure ||
                trip.trip_update.stop_time_update.arrival ||
                {}
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
      if (typeof data !== 'undefined') {
        const timeUpdate =
          data.stop_time_update.departure || data.stop_time_update.arrival || {}
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
    request(newOpts, function(err, response, body) {
      if (err) {
        res.send({
          error: err,
        })
        return
      }
      try {
        body = JSON.parse(body)
      } catch (err) {
        console.error('rt error', err)
        return res.send({
          error: err,
        })
      }
      if (body.response.entity) {
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
  },

  getLocationsForLine: async (req, res) => {
    const { line } = req.params
    if (realtime.currentVehicleData.entity === undefined) {
      return res.send([])
    }

    try {
      const sqlRouteIdRequest = connection.get().request()
      sqlRouteIdRequest.input('route_short_name', sql.VarChar(50), line)
      const routeIdResult = await sqlRouteIdRequest.query(
        `
        SELECT route_id
        FROM routes
        WHERE route_short_name = @route_short_name
        `
      )
      const routeIds = routeIdResult.recordset.map(r => r.route_id)
      const trips = realtime.currentVehicleData.entity.filter(entity =>
        routeIds.includes(entity.vehicle.trip.route_id)
      )
      // this is good enough because data comes from auckland transport
      const tripIds = trips.map(entity => entity.vehicle.trip.trip_id)
      const escapedTripIds = `'${tripIds.join("', '")}'`
      const sqlTripIdRequest = connection.get().request()
      const tripIdRequest = await sqlTripIdRequest.query(`
        SELECT *
        FROM trips
        WHERE trip_id IN (${escapedTripIds})
        `)

      const tripIdsMap = {}
      tripIdRequest.recordset.forEach(
        record => (tripIdsMap[record.trip_id] = record.direction_id)
      )

      // now we return the structued data finally
      const result = trips.map(entity => ({
        latitude: entity.vehicle.position.latitude,
        longitude: entity.vehicle.position.longitude,
        bearing: entity.vehicle.position.bearing || null,
        direction: tripIdsMap[entity.vehicle.trip.trip_id],
        updatedAt: realtime.lastVehicleUpdate,
      }))
      res.send(result)
    } catch (err) {
      console.error(err)
      res.status(500).send(err)
    }
  },
}
cache.ready.push(realtime.schedulePull)
cache.ready.push(realtime.scheduleLocationPull)
module.exports = realtime
