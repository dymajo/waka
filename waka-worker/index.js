const { Router } = require('express')
const createLogger = require('./logger.js')
const cityMetadata = require('../cityMetadata.json')

// const router = require('./router.js')
const Connection = require('./db/connection.js')
// const cache = require('./cache')
const Realtime = require('./realtime/index.js')

class WakaWorker {
  constructor(config) {
    const { prefix, version, db } = config

    this.config = config
    const logger = createLogger(prefix, version)
    this.logger = logger
    const connection = new Connection({ logger, db })
    this.connection = connection

    this.router = new Router()
    this.realtime = new Realtime({ logger, connection })

    this.bounds = { lat: { min: 0, max: 0 }, lon: { min: 0, max: 0 } }
    this.signature = this.signature.bind(this)

    this.bindRoutes()
  }

  async start() {
    await this.connection.open()
    this.logger.info('Connected to the Database')
    // cache start or something.
  }

  signature() {
    const { bounds, config } = this
    const { prefix, version } = config

    // the region may have multiple cities
    let city = cityMetadata[prefix]
    if (!Object.prototype.hasOwnProperty.call(city, 'name')) {
      city = city[prefix]
    }
    const { name, secondaryName, longName } = city
    return { prefix, version, bounds, name, secondaryName, longName }
  }

  bindRoutes() {
    const { realtime, router } = this
    router.get('/info', (req, res) => res.send(this.signature()))
    router.get('/realtime-healthcheck', realtime.healthcheck)
    router.get('/realtime/:line', realtime.vehicleLocationV2)
    router.post('/realtime', realtime.stopInfo)
    router.post('/vehicle_location', realtime.vehicleLocation)
  }
}
module.exports = WakaWorker
