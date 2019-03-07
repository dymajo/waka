const { Router } = require('express')
const createLogger = require('./logger.js')

// const router = require('./router.js')
const Connection = require('./db/connection.js')
// const cache = require('./cache')

class WakaWorker {
  constructor(props) {
    const { prefix, version, db } = props

    const logger = createLogger(prefix, version)
    this.logger = logger
    this.router = new Router()
    this.connection = new Connection({ logger, db })
    this.bindRoutes()
  }

  async start() {
    await this.connection.open()
    this.logger.info('Connected to the Database')
    // cache start or something.
  }

  bindRoutes() {
    // TODO
  }
}
module.exports = WakaWorker
