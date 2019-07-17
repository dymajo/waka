import Protobuf from 'protobufjs'
import BaseRealtime, { BaseRealtimeProps, PROTOBUF_PATH } from './BaseRealtime'
import {
  PositionFeedMessage,
  UpdateFeedMessage,
  AlertFeedMessage,
} from '../gtfs'

export interface MultiEndpointProps extends BaseRealtimeProps {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  modes: string[]
  tripUpdateEndpoint: string
  vehiclePositionEndpoint: string
  serviceAlertEndpoint: string
}

abstract class MultiEndpoint extends BaseRealtime {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  protobuf: protobuf.Type
  modes: string[]
  tripUpdateEndpoint: string
  vehiclePositionEndpoint: string
  serviceAlertEndpoint: string

  constructor(props: MultiEndpointProps) {
    super(props)
    this.modes = props.modes
    this.tripUpdateEndpoint = props.tripUpdateEndpoint
    this.vehiclePositionEndpoint = props.vehiclePositionEndpoint
    this.serviceAlertEndpoint = props.serviceAlertEndpoint
  }

  start = async (rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>) => {
    const { apiKey, logger, apiKeyRequired } = this
    if (!rateLimiter) {
      logger.warn('no rate limiter')
      throw new Error('no rate limiter, rate limiter is required')
    }
    this.rateLimiter = rateLimiter
    if (apiKeyRequired && !apiKey) {
      logger.warn('No API Key, will not show realtime.')
      throw new Error('API key is required for realtime')
    } else {
      const pb = await Protobuf.load(PROTOBUF_PATH)
      const FeedMessage = pb.lookupType('transit_realtime.FeedMessage')
      this.protobuf = FeedMessage
      logger.info('Realtime Started.')

      this.scheduleAlertPull()
      this.scheduleUpdatePull()
      this.scheduleVehiclePositionPull()
    }
  }

  stop = () => {
    const { logger } = this
    clearTimeout(this.tripUpdateTimeout)
    clearTimeout(this.vehiclePositionTimeout)
    clearTimeout(this.serviceAlertTimeout)
    this.tripUpdateTimeout = null
    this.vehiclePositionTimeout = null
    this.serviceAlertTimeout = null
    logger.info('Realtime Stopped.')
  }

  setupProtobuf = async () => {
    if (!this.protobuf) {
      const pb = await Protobuf.load(PROTOBUF_PATH)
      const FeedMessage = pb.lookupType('transit_realtime.FeedMessage')
      this.protobuf = FeedMessage
    }
  }

  scheduleUpdatePull = async () => {
    const {
      logger,
      modes,
      axios,
      tripUpdateEndpoint,
      redis,
      rateLimiter,
      scheduleUpdatePull,
      scheduleUpdatePullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    logger.info('Starting Trip Update Pull')

    for (const mode of modes) {
      try {
        const res = await rateLimiter(() =>
          axios.get(`${tripUpdateEndpoint}/${mode}`)
        )
        const oldModified = await redis.getKey(mode, 'last-trip-update')
        if (res.headers['last-modified'] !== oldModified) {
          const uInt8 = new Uint8Array(res.data)
          const _feed = protobuf.decode(uInt8) as unknown
          const feed = _feed as UpdateFeedMessage
          await this.processTripUpdates(feed.entity)

          if (res.headers['last-modified']) {
            await redis.setKey(
              mode,
              res.headers['last-modified'],
              'last-trip-update'
            )
          }
        }
      } catch (err) {
        logger.error({ err }, 'Failed to pull trip updates')
      }
    }

    await redis.setKey('default', new Date().toISOString(), 'last-trip-update')
    logger.info('Pulled Trip Updates.')

    this.tripUpdateTimeout = setTimeout(
      scheduleUpdatePull,
      scheduleUpdatePullTimeout
    )
  }

  scheduleVehiclePositionPull = async () => {
    const {
      logger,
      modes,
      axios,
      rateLimiter,
      redis,
      scheduleVehiclePositionPull,
      scheduleVehiclePositionPullTimeout,
      vehiclePositionEndpoint,
      setupProtobuf,
      protobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    logger.info('Starting Vehicle Position Pull')
    for (const mode of modes) {
      try {
        const res = await rateLimiter(() =>
          axios.get(`${vehiclePositionEndpoint}/${mode}`)
        )
        const oldModified = await redis.getKey(
          mode,
          'last-vehicle-position-update'
        )
        if (res.headers['last-modified'] !== oldModified) {
          const uInt8 = new Uint8Array(res.data)
          const _feed = protobuf.decode(uInt8) as unknown
          const feed = _feed as PositionFeedMessage
          await this.processVehiclePositions(feed.entity)
          if (res.headers['last-modified']) {
            await redis.setKey(
              mode,
              res.headers['last-modified'],
              'last-vehicle-position-update'
            )
          }
        }
      } catch (err) {
        logger.error({ err }, 'Failed to pull vehicle positions')
      }
    }
    await redis.setKey(
      'default',
      new Date().toISOString(),
      'last-vehicle-position-update'
    )
    logger.info('Pulled Vehicle Locations')
    this.vehiclePositionTimeout = setTimeout(
      scheduleVehiclePositionPull,
      scheduleVehiclePositionPullTimeout
    )
  }

  scheduleAlertPull = async () => {
    const {
      logger,
      modes,
      axios,
      serviceAlertEndpoint,
      redis,
      rateLimiter,
      scheduleAlertPull,
      scheduleAlertPullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    logger.info('Starting Service Alert Pull')

    for (const mode of modes) {
      try {
        const res = await rateLimiter(() =>
          axios.get(`${serviceAlertEndpoint}/${mode}`)
        )
        const oldModified = await redis.getKey(mode, 'last-alert-update')
        if (res.headers['last-modified'] !== oldModified) {
          const uInt8 = new Uint8Array(res.data)
          const _feed = protobuf.decode(uInt8) as unknown
          const feed = _feed as AlertFeedMessage
          await this.processAlerts(feed.entity)

          if (res.headers['last-modified']) {
            await redis.setKey(
              mode,
              res.headers['last-modified'],
              'last-alert-update'
            )
          }
        }
      } catch (err) {
        // logger.error({ err }, `Failed to pull ${mode} service alert`)
      }
    }

    await redis.setKey('default', new Date().toISOString(), 'last-trip-update')
    logger.info('Pulled Service Alert Updates.')

    this.tripUpdateTimeout = setTimeout(
      scheduleAlertPull,
      scheduleAlertPullTimeout
    )
  }
}

export default MultiEndpoint
