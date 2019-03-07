const bunyan = require('bunyan')

const logger = bunyan.createLogger({
  name: 'waka-orchestrator',
  serializers: bunyan.stdSerializers,
})

module.exports = logger
