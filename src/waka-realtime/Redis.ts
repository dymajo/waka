/* eslint-disable promise/prefer-await-to-callbacks */
import Redis from 'ioredis'
import { TripUpdate, VehiclePosition, Alert } from '../gtfs'
import { Logger, RedisConfig } from '../typings'

interface WakaRedisProps {
  prefix: string
  logger: Logger
  config: RedisConfig
}

class WakaRedis {
  client: Redis.Redis
  prefix: string
  logger: Logger
  config: RedisConfig
  connected: boolean
  constructor(props: WakaRedisProps) {
    this.prefix = props.prefix
    this.logger = props.logger
    this.config = props.config
  }

  tryClient = (client: Redis.Redis, config: RedisConfig) => {
    return (
      client ||
      new Redis({
        ...config,
        retryStrategy: () => 0,
      })
    )
  }

  start = async (client?: Redis.Redis) => {
    if (this.client && this.connected) {
      return
    }
    const { logger, config } = this
    logger.info('Connecting to Redis')

    const Client = this.tryClient(client, config)
    Client.on('error', error => {
      logger.warn({ ...error }, error.toString()) // captures our logs nicely
    })

    while (!this.connected) {
      try {
        const res = await Client.ping()
        this.client = Client
        this.connected = true
      } catch (error) {
        logger.error('Could not connect to Redis, will continue to retry')
      }
    }
    logger.info('Connected to Redis')
  }

  stop = () => {
    const { logger } = this
    logger.info('Disconnected from Redis')
    if (this.client) {
      this.client.disconnect()
    }
    this.client = null
  }

  checkRedis = () => {
    if (this.client === null) {
      throw Error('redis not started')
    }
  }

  setKey = (
    key: string,
    value: string,
    type:
      | 'trip-update'
      | 'vehicle-position'
      | 'alert'
      | 'alert-route'
      | 'alert-route-type'
      | 'alert-route'
      | 'alert-trip'
      | 'alert-stop'
      | 'vehicle-position-route'
      | 'last-trip-update'
      | 'last-vehicle-position-update'
      | 'last-alert-update'
  ): Promise<string> => {
    this.checkRedis()
    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:${type}:${key}`

    return this.client.set(fullKey, value, 'EX', 60)
  }

  getTripUpdate = async (tripId: string): Promise<TripUpdate> => {
    this.checkRedis()

    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:trip-update:${tripId}`
    const res = await this.client.get(fullKey)
    return JSON.parse(res)
  }

  getVehiclePosition = async (tripId: string): Promise<VehiclePosition> => {
    this.checkRedis()

    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:vehicle-position:${tripId}`
    const res = await this.client.get(fullKey)
    return JSON.parse(res)
  }

  getAlert = async (alertId: string): Promise<Alert> => {
    this.checkRedis()

    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:alert:${alertId}`
    const res = await this.client.get(fullKey)
    return JSON.parse(res)
  }

  getArrayKey = async (
    key: string,
    type:
      | 'alert-route'
      | 'alert-route-type'
      | 'alert-trip'
      | 'alert-stop'
      | 'vehicle-position-route'
  ): Promise<string[]> => {
    this.checkRedis()

    const { prefix } = this
    switch (type) {
      case 'vehicle-position-route':
      case 'alert-route':
      case 'alert-route-type':
      case 'alert-trip':
      case 'alert-stop': {
        const fullKey = `waka-rt:${prefix}:${type}:${key}`
        const res = await this.client.get(fullKey)
        if (res) {
          return res.split(',')
        }
        return []
      }

      default:
        throw Error('unknown type')
    }
  }
  getKey = async (
    key: string,
    type:
      | 'last-trip-update'
      | 'last-vehicle-position-update'
      | 'last-alert-update'
  ): Promise<string> => {
    this.checkRedis()

    const { prefix } = this
    switch (type) {
      case 'last-trip-update':
      case 'last-vehicle-position-update':
      case 'last-alert-update': {
        const fullKey = `waka-rt:${prefix}:${type}:${key}`
        return this.client.get(fullKey)
      }
      default:
        throw Error('unknown type')
    }
  }
}

export default WakaRedis
