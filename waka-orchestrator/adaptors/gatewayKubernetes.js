const logger = require('../logger.js')

// seeing as I'm on the kubes team at work,
// I should probaby get this to also work with kubes.
class GatewayKubernetes {
  start() {
    logger.error('Kubernetes Gateway Not Implemented!')
  }
}
module.exports = GatewayKubernetes
