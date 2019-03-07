const bunyan = require('bunyan')

const logger = bunyan.createLogger({
  name: 'waka-proxy',
  serializers: bunyan.stdSerializers,
})

module.exports = logger
