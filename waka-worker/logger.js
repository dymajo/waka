const bunyan = require('bunyan')

const createLogger = (prefix, version) =>
  bunyan.createLogger({
    name: 'waka-worker',
    prefix,
    version,
    serializers: bunyan.stdSerializers,
  })

module.exports = createLogger
