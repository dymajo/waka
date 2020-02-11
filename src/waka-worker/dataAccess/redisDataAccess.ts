import WakaRedis from '../../waka-realtime/Redis'
import * as Logger from 'bunyan'

interface RedisDataAccessProps {
  logger: Logger
  prefix: string
  redis: WakaRedis
}

export default class RedisDataAccess {
  logger: Logger
  prefix: string
  redis: WakaRedis

  constructor(props: RedisDataAccessProps) {
    const { logger, prefix, redis } = props
    this.logger = logger
    this.prefix = prefix
    this.redis = redis
  }

  async getKey(key) {
    const { redis } = this
    return redis.client.get(key)
  }

  async getLinesForStop(stopCode) {
    const { prefix, logger } = this
    try {
      const transfers = await this.getKey(`waka-worker:${prefix}:stop-transfers:${stopCode}`)
      if (!transfers) {
        return []
      }
      const linesObject = transfers.split(',').map(line => {
        // this handles multiple '/' characters
        const split = line.split('/')
        const components = [split.shift(), split.join('/')]
        const [agency_id, route_short_name] = components
        return {
          agency_id,
          route_short_name
        }
      })
      return linesObject
    } catch (err) {
      logger.warn({ err })
      return []
    }
  }
}