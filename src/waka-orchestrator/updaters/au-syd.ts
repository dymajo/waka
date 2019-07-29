import axios from 'axios'
import { pRateLimit, RedisQuotaManager } from 'p-ratelimit'
import logger from '../logger'
import { TfNSWUpdaterProps, WakaConfig } from '../../typings'
import { isKeyof } from '../../utils'
import WakaRedis from '../../waka-realtime/Redis'

const tfnswmodes = {
  buses1: { endpoint: 'buses/SMBSC001' },
  buses2: { endpoint: 'buses/SMBSC002' },
  buses3: { endpoint: 'buses/SMBSC003' },
  buses4: { endpoint: 'buses/SMBSC004' },
  busse5: { endpoint: 'buses/SMBSC005' },
  buses6: { endpoint: 'buses/SBSC006' },
  buses7: { endpoint: 'buses/SMBSC007' },
  buses8: { endpoint: 'buses/SMBSC008' },
  buses9: { endpoint: 'buses/SMBSC009' },
  buses10: { endpoint: 'buses/SMBSC010' },
  buses11: { endpoint: 'buses/SMBSC012' },
  buses12: { endpoint: 'buses/SMBSC013' },
  buses13: { endpoint: 'buses/SMBSC014' },
  buses14: { endpoint: 'buses/SMBSC015' },
  buses15: { endpoint: 'buses/OSMBSC001' },
  buses16: { endpoint: 'buses/OSMBSC002' },
  buses17: { endpoint: 'buses/OSMBSC003' },
  buses18: { endpoint: 'buses/OSMBSC004' },
  buses19: { endpoint: 'buses/OSMBSC006' },
  buses20: { endpoint: 'buses/OSMBSC007' },
  buses21: { endpoint: 'buses/OSMBSC008' },
  buses22: { endpoint: 'buses/OSMBSC009' },
  buses23: { endpoint: 'buses/OSMBSC010' },
  buses24: { endpoint: 'buses/OSMBSC011' },
  buses25: { endpoint: 'buses/OSMBSC012' },
  buses26: { endpoint: 'buses/NISC001' },
  buses27: { endpoint: 'buses/ECR109' },
  ferries: { endpoint: 'ferries' },
  lightrail1: { endpoint: 'lightrail/innerwest' },
  lightrail2: { endpoint: 'lightrail/newcastle' },
  trains1: { endpoint: 'nswtrains' },
  trains2: { endpoint: 'sydneytrains' },
}

class TfNSWUpdater {
  prefix: string
  timeout: NodeJS.Timeout
  apiKey: string
  callback: (
    prefix: string,
    version: string,
    adjustMapping: boolean
  ) => Promise<void>
  delay: number
  interval: number
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  redis: WakaRedis
  config: WakaConfig

  constructor(props: TfNSWUpdaterProps) {
    const { apiKey, callback, delay, interval, config } = props
    this.apiKey = apiKey
    this.callback = callback
    this.delay = delay || 5
    this.interval = interval || 1440
    this.prefix = 'au-syd'
    this.timeout = null
    this.config = config
  }

  start = async () => {
    const { apiKey, check, delay, prefix, config } = this
    const { redis: redisConfig } = config
    this.redis = new WakaRedis({ prefix, logger, config: redisConfig })
    await this.redis.start()
    const quota = {
      interval: 1000,
      rate: 5,
      concurrency: 5,
    }
    try {
      this.rateLimiter = this.redis
        ? pRateLimit(
            new RedisQuotaManager(quota, this.prefix, this.redis.client)
          )
        : pRateLimit(quota)
    } catch (error) {
      logger.error(error)
    }
    if (!apiKey) {
      logger.error({ prefix }, 'API Key must be supplied!')
    }
    logger.info({ prefix, mins: delay }, 'Waiting to download.')
    // begin check
    this.check()
    this.timeout = setTimeout(check, delay * 60000)
  }

  check = async () => {
    const { callback, check, interval, checkApi, prefix } = this
    let newest = new Date(0)
    try {
      for (const mode in tfnswmodes) {
        if (Object.prototype.hasOwnProperty.call(tfnswmodes, mode)) {
          const tfnswmode = isKeyof(tfnswmodes, mode)
            ? tfnswmodes[mode]
            : undefined
          if (tfnswmode) {
            const { endpoint } = tfnswmode
            const version = await this.rateLimiter(() => checkApi(endpoint))
            if (newest < version) {
              newest = version
            }
          }
        }
      }
      const year = newest.getUTCFullYear()
      const month = newest.getUTCMonth() + 1
      const date = newest.getUTCDate()
      const newVersion = `${year}${month
        .toString()
        .padStart(2, '0')}${date.toString().padStart(2, '0')}`

      callback(prefix, newVersion, true)
    } catch (err) {
      logger.error({ err }, 'Could not update.')
    }
  }

  checkApi = async (endpoint: string) => {
    const { apiKey } = this
    const options = {
      url: `https://api.transport.nsw.gov.au/v1/gtfs/schedule/${endpoint}`,
      headers: {
        Authorization: apiKey,
      },
    }
    try {
      const res = await axios.head(options.url, {
        headers: options.headers,
      })

      return new Date(res.headers['last-modified'])
    } catch (err) {
      logger.error({ err }, `Could not reach ${endpoint} api`)
      return new Date(0)
    }
  }

  stop = () => {
    const { prefix } = this
    logger.info({ prefix }, 'Stopped updater.')
    clearTimeout(this.timeout)
  }
}

export default TfNSWUpdater
