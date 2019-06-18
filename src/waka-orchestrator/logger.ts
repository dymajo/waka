import * as bunyan from 'bunyan'

const logger = bunyan.createLogger({
  name: 'waka-orchestrator',
  serializers: bunyan.stdSerializers,
})

export default logger
