const logger = require('../logger.js')

class GatewayEcs {
  start() {
    logger.info('ECS Gateway Started.')
  }
}
module.exports = GatewayEcs
