import { createLogger, stdSerializers } from 'bunyan'

const logger = (prefix: string, version: string) =>
  createLogger({
    name: 'waka-importer',
    prefix,
    version,
    serializers: stdSerializers,
  })

export default logger
