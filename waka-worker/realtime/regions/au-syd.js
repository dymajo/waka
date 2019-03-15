const GtfsRealtimeBindings = require('gtfs-realtime-bindings')
const fetch = require('node-fetch')

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
    // this.scheduleLocationPull()
    logger.info('TfNSW Realtime Started.')
  }

  async schedulePull() {
    const { logger, tripUpdateOptions } = this
    const newData = {}
    modes.forEach(async mode => {
      const data = await fetch(`${tripUpdateOptions.url}/${mode}`, {
        headers: tripUpdateOptions.headers,
      })
      if (data.ok) {
        const body = await data.text()
        const buffer = Buffer.from(body)
        try {
          const feed = GtfsRealtimeBindings.FeedMessage.decode(buffer)
          feed.entity.forEach(trip => {
            console.log(trip)
            if (trip.trip_update) {
              newData[trip.trip_update.trip.trip_id] = trip.trip_update
            }
          })
        } catch (error) {
          console.error(error)
        }
      } else {
        console.log(data.statusText)
      }
    })
    this.currentData = newData
    this.currentDataFails = 0
    this.lastUpdate = new Date()
    setTimeout(this.schedulePull, schedulePullTimeout)
  }

  async scheduleLocationPull() {
    const { logger, vehicleLocationOptions } = this
    const newVehicleData = {}
    modes.forEach(async mode => {
      const data = await fetch(`${vehicleLocationOptions.url}/${mode}`, {
        headers: vehicleLocationOptions.headers,
      })
      if (data.ok) {
        const body = await data.text()
        const buffer = Buffer.from(body)

        const feed = GtfsRealtimeBindings.FeedMessage.decode(buffer)
        feed.entity.forEach(trip => {
          console.log(trip)
          if (trip.trip_update) {
            newVehicleData[trip.trip_update.trip.trip_id] = trip.trip_update
          }
        })
      } else {
        console.log(data.statusText)
      }
    })
  }
}

module.exports = RealtimeAUSYD
