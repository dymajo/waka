import { pRateLimit, QuotaManager, RedisQuotaManager, Quota } from 'p-ratelimit'

import WakaRedis from './Redis'
import createLogger from './logger'

import { isKeyof } from '../utils'
import { Logger, RedisConfig } from '../typings'

import BaseRealtime from './BaseRealtime'

import AucklandRealtime from './regions/nz-akl'
import CanberraRealtime from './regions/au-cbr'
import SydneyRealtime from './regions/au-syd'
import NYCRealtime from './regions/us-nyc'
import BostonRealtime from './regions/us-bos'
import SanFranciscoRealtime from './regions/us-sfo'

const Regions = {
  'au-cbr': CanberraRealtime,
  'au-syd': SydneyRealtime,
  'nz-akl': AucklandRealtime,
  'us-bos': BostonRealtime,
  'us-nyc': NYCRealtime,
  'us-sfo': SanFranciscoRealtime,
}

interface RealtimeConfig {
  prefix: string
  quota?: Quota
  version: string
  api: { [prefix: string]: string }
  redis: RedisConfig
}

class Realtime {
  wakaRedis: WakaRedis
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
    this.wakaRedis = new WakaRedis({
      prefix: this.prefix,
      logger,
      config: config.redis,
    })

    const apiKey = config.api[this.prefix]
    this.region = isKeyof(Regions, this.prefix)
      ? new Regions[this.prefix]({
          wakaRedis: this.wakaRedis,
          rateLimiter: this.rateLimiter,
          logger: this.logger,
          apiKey,
        })
      : null
  }

  start = async () => {
    if (this.region) {
      try {
        await this.wakaRedis.start()
        if (this.prefix === 'au-syd') {
          console.log('redis connected:', this.wakaRedis.connected)
          const quota: Quota = this.config.quota || {
            interval: 1000,
            rate: 5,
            concurrency: 5,
          }
          this.quotaManager = this.wakaRedis.client
            ? new RedisQuotaManager(quota, this.prefix, this.wakaRedis.client)
            : quota
          this.quotaManager = quota
          this.rateLimiter = pRateLimit(this.quotaManager)
        }
        if (this.prefix === 'us-sfo') {
          console.log('redis connected:', this.wakaRedis.connected)

          const quota: Quota = this.config.quota || {
            interval: 3600,
            rate: 60,
            concurrency: 5,
          }
          this.quotaManager = this.wakaRedis.client
            ? new RedisQuotaManager(quota, this.prefix, this.wakaRedis.client)
            : quota
          this.quotaManager = quota
          this.rateLimiter = pRateLimit(this.quotaManager)
        }
        await this.region.start(this.rateLimiter)
      } catch (error) {
        this.logger.error(error)
      }
    }
  }

  stop = () => {
    if (this.region) {
      this.wakaRedis.stop()
      this.region.stop()
    }
  }
}

export default Realtime
