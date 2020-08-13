import { createLogger, stdSerializers } from 'bunyan'

const logger = (prefix, version) =>
  createLogger({
    name: 'waka-worker',
    prefix,
    version,
    serializers: stdSerializers,
  })

export default logger
