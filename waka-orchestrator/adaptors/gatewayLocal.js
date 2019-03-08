const { Router } = require('express')
const logger = require('../logger.js')

class GatewayLocal {
  constructor() {
    this.router = new Router()
  }

  start() {
    logger.info('Local Gateway Started.')
  }
}
module.exports = GatewayLocal
