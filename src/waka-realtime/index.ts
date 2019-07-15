import { pRateLimit, QuotaManager, RedisQuotaManager, Quota } from 'p-ratelimit'

import Redis from './Redis'
import createLogger from './logger'

import { isKeyof } from '../utils'
import { Logger, RedisConfig } from '../typings'

import BaseRealtime from './BaseRealtime'

import AucklandRealtime from './regions/nz-akl'
import CanberraRealtime from './regions/au-cbr'
import SydneyRealtime from './regions/au-syd'

const Regions = {
  'au-cbr': CanberraRealtime,
  'au-syd': SydneyRealtime,
  'nz-akl': AucklandRealtime,
}

interface RealtimeConfig {
  prefix: string
  quota?: Quota
  version: string
  api: { [prefix: string]: string }
  redis: RedisConfig
}

class Realtime {
  redis: Redis
  prefix: string
  quotaManager: QuotaManager | Quota
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  region: BaseRealtime
  logger: Logger
  config: RealtimeConfig
  constructor(config: RealtimeConfig) {
    this.config = config
    const logger = createLogger(config.prefix, config.version)
    this.logger = logger
    this.prefix = config.prefix
    this.redis = new Redis({ prefix: this.prefix, logger })

    const apiKey = config.api[this.prefix]
    this.region = isKeyof(Regions, this.prefix)
      ? new Regions[this.prefix]({
          redis: this.redis,
          rateLimiter: this.rateLimiter,
          logger: this.logger,
          apiKey,
        })
      : null
  }

  start = async () => {
    if (this.region) {
      await this.redis.start()
      const quota: Quota = this.config.quota || {
        interval: 1000,
        rate: 5,
        concurrency: 5,
      }
      this.quotaManager = this.redis.client
        ? new RedisQuotaManager(quota, this.prefix, this.redis.client)
        : quota
      this.rateLimiter = pRateLimit(this.quotaManager)
      await this.region.start(this.rateLimiter)
    }
  }

  stop = () => {
    if (this.region) {
      this.redis.stop()
      this.region.stop()
    }
  }
}

export default Realtime
