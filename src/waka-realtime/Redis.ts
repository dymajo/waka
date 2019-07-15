/* eslint-disable promise/prefer-await-to-callbacks */
import Redis from 'ioredis'
import { TripUpdate, VehiclePosition, Alert, CongestionLevel } from '../gtfs'
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
  constructor(props: WakaRedisProps) {
    this.prefix = props.prefix
    this.logger = props.logger
    this.config = props.config
  }

  start = async (client?: Redis.Redis) => {
    const { logger, config } = this
    this.client =
      client ||
      new Redis({
        ...config,
        retryStrategy: () => 30000,
      })
    console.log(this.client)
    this.client.on('error', err => {})
  }

  stop = () => {
    this.client = null
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
    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:${type}:${key}`

    return this.client.set(fullKey, value, 'EX', 60)
  }

  getTripUpdate = async (tripId: string): Promise<TripUpdate> => {
    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:trip-update:${tripId}`
    const res = await this.client.get(fullKey)
    return JSON.parse(res)
  }

  getVehiclePosition = async (tripId: string): Promise<VehiclePosition> => {
    const { prefix } = this
    const fullKey = `waka-rt:${prefix}:vehicle-position:${tripId}`
    const res = await this.client.get(fullKey)
    return JSON.parse(res)
  }

  getAlert = async (alertId: string): Promise<Alert> => {
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
