const request = require('request')
const path = require('path')
const protobuf = require('protobufjs')

const log = require('../../server-common/logger.js')
const cache = require('../cache.js')
const search = require('../stops/search.js')

const routeTypeMap = new Map()
routeTypeMap.set(0, 'lightrail')
routeTypeMap.set(2, 'sydneytrains')
routeTypeMap.set(3, 'buses')
routeTypeMap.set(4, 'ferries')

const modeTypeMap = new Map()
routeTypeMap.forEach((value, key) => {
  modeTypeMap.set(value, key)
})

const routeMapper = {
  route: mode => routeTypeMap.get(mode),
  mode: route => modeTypeMap.get(route),
}

const modes = ['sydneytrains', 'buses', 'ferries', 'lightrail', 'nswtrains']

const defaultDownloadOptions = JSON.stringify({
  url: 'https://api.transport.nsw.gov.au/v1/gtfs/realtime/',
  encoding: null,
  headers: {
    Authorization: process.env.nswApiKey,
    Accept: 'application/x-protobuf',
  },
})

const wait = async function(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms)
  })
}
const realtime = {
  currentData: {},
  currentDataFails: 0,
  schedulePull: async function() {
    for (let mode of modes) {
      const newOptions = JSON.parse(defaultDownloadOptions)
      newOptions.url += mode
      try {
        realtime.currentData[mode] = await realtime.tripUpdate(newOptions, mode)
        // console.log('got', mode)
      } catch (err) {
        console.log(err)
      }
      await wait(250)
    }
    setTimeout(realtime.schedulePull, 20000)
  },
  getTripsEndpoint: function(req, res) {
    const rt = realtime.getTripsCachedSydney(req.body.stop_id, req.body.trips)
    res.send(rt)
  },
  getVehicleLocationEndpoint: function() {},
  getTripsCachedSydney: function(stop_id, trips) {
    const realtimeInfo = {}
    Object.keys(trips).forEach(function(trip) {
      const routeType = search.stopsRouteType[stop_id]
      const mode = routeMapper.route(routeType)
      // console.log('mode', mode)
      const data = realtime.currentData[mode][trip]
      // console.log(realtime.currentData[mode])
      // console.log(data)
      if (typeof data !== 'undefined') {
        // console.log('it defined')
        const timeUpdate =
          data.stopTimeUpdate.departure || data.stopTimeUpdate.arrival || {}
        realtimeInfo[trip] = {
          stop_sequence: data.stopTimeUpdate.stopSequence,
          delay: timeUpdate.delay,
          timeStamp: timeUpdate.time,
          v_id: data.vehicle.id,
        }
      }
    })
    return realtimeInfo
  },
  initPB: function() {
    protobuf.load(path.resolve(__dirname, './gtfs-realtime.proto'), function(
      err,
      root
    ) {
      if (err) {
        throw err
      }
      log('Protobuf Loaded')
      realtime.decoder = root
    })
  },
  tripUpdate: function(newOptions, mode) {
    return new Promise(function(resolve, reject) {
      request(newOptions, function(error, response, body) {
        if (error) {
          realtime.currentDataFails++
          return reject(error)
        }
        try {
          const gtfs = realtime.decoder.lookupType('FeedMessage')
          const message = gtfs.decode(body)
          if (message) {
            // console.log(message.entity.length, mode)
            const newData = {}
            message.entity.forEach(function(trip) {
              newData[trip.id] = trip.tripUpdate
            })
            realtime.currentDataFails = 0
            resolve(newData)
          } else {
            log('could not get any data from tfnsw')
          }
          resolve()
        } catch (err) {
          realtime.currentDataFails++
          return reject(err)
        }
      })
    })
  },
}

realtime.initPB()
cache.ready.push(realtime.schedulePull)
module.exports = realtime
