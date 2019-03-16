const GtfsRealtimeBindings = require('gtfs-realtime-bindings')
const fetch = require('node-fetch')
const request = require('request')
const protobuf = require('protobufjs')

const schedulePullTimeout = 20000
const scheduleLocationPullTimeout = 15000

const modes = [
  'buses',
  'ferries',
  'lightrail/innerwest',
  'lightrail/newcastle',
  'nswtrains',
  'sydneytrains',
]

class RealtimeAUSYD {
  constructor(props) {
    const { apiKey, connection, logger } = props
    this.connection = connection
    this.logger = logger
    this.apiKey = apiKey

    this.lastUpdate = null
    this.lastVehicleUpdate = null
    this.currentData = {}
    this.currentDataFails = 0
    this.currentVehicleData = {}
    this.currentVehicleDataFails = null

    this.tripUpdateOptions = {
      url: 'https://api.transport.nsw.gov.au/v1/gtfs/realtime',
      headers: {
        Authorization: apiKey,
      },
    }

    this.vehicleLocationOptions = {
      url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos',
      headers: {
        Authorization: apiKey,
      },
    }

    this.schedulePull = this.schedulePull.bind(this)
    this.scheduleLocationPull = this.scheduleLocationPull.bind(this)
  }

  start() {
    const { apiKey, logger } = this
    if (!apiKey) {
      logger.warn('No TfNSW API Key, will not show realtime.')
    }
    this.schedulePull()
    this.scheduleLocationPull()
    logger.info('TfNSW Realtime Started.')
  }

  async schedulePull() {
    const { logger, tripUpdateOptions } = this
    const newData = {}
    const root = await protobuf.load('tfnsw-gtfs-realtime.proto')
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
    modes.forEach(async mode => {
      request(
        {
          url: `${tripUpdateOptions.url}/${mode}`,
          headers: tripUpdateOptions.headers,
          encoding: null,
        },
        (err, res, body) => {
          if (!err && res.statusCode === 200) {
            try {
              const feed = FeedMessage.decode(body)

              // const feed = GtfsRealtimeBindings.TripUpdate.decode(buffer)
              feed.entity.forEach(trip => {
                if (trip.trip_update) {
                  newData[trip.trip_update.trip.trip_id] = trip.trip_update
                }
              })
            } catch (err) {
              logger.error(err)
            }
          }
        }
      )
    })
    this.currentData = newData
    this.currentDataFails = 0
    this.lastUpdate = new Date()
    setTimeout(this.schedulePull, schedulePullTimeout)
  }

  async scheduleLocationPull() {
    const { logger, vehicleLocationOptions } = this
    const root = await protobuf.load('tfnsw-gtfs-realtime.proto')

    const FeedMessage = root.lookupType('transit_realtime.FeedMessage')
    const newVehicleData = {}
    modes.forEach(async mode => {
      request(
        {
          url: `${vehicleLocationOptions.url}/${mode}`,
          headers: vehicleLocationOptions.headers,
          encoding: null,
        },
        (err, res, body) => {
          if (!err && res.statusCode === 200) {
            try {
              const feed = FeedMessage.decode(body)

              feed.entity.forEach(trip => {
                if (trip.trip_update) {
                  newVehicleData[trip.trip_update.trip.trip_id] =
                    trip.trip_update
                }
              })
            } catch (err) {
              console.error(err)
            }
          }
        }
      )
    })
  }
}

module.exports = RealtimeAUSYD
