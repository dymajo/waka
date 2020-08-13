import { createLogger, stdSerializers } from 'bunyan'

const logger = (prefix: string) =>
  createLogger({
    name: 'waka-realtime',
    prefix,
    serializers: stdSerializers,
  })

export default logger
