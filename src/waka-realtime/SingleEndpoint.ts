import Protobuf from 'protobufjs'
import BaseRealtime, { BaseRealtimeProps, PROTOBUF_PATH } from './BaseRealtime'
import {
  PositionFeedMessage,
  UpdateFeedMessage,
  AlertFeedMessage,
} from '../gtfs'

export interface SingleEndpointProps extends BaseRealtimeProps {
  vehiclePositionEndpoint: string
  tripUpdateEndpoint: string
  serviceAlertEndpoint: string
}

abstract class SingleEndpoint extends BaseRealtime {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  protobuf: protobuf.Type
  modes: string[]
  vehiclePositionEndpoint: string
  tripUpdateEndpoint: string
  serviceAlertEndpoint: string
  constructor(props: SingleEndpointProps) {
    super(props)
    this.vehiclePositionEndpoint = props.vehiclePositionEndpoint
    this.tripUpdateEndpoint = props.tripUpdateEndpoint
    this.serviceAlertEndpoint = props.serviceAlertEndpoint
  }

  start = async () => {
    const { apiKey, logger, apiKeyRequired } = this
    if (apiKeyRequired && !apiKey) {
      logger.warn('No API Key, will not show realtime.')
      throw new Error('API key is required for realtime')
    } else {
      const pb = await Protobuf.load(PROTOBUF_PATH)
      const FeedMessage = pb.lookupType('transit_realtime.FeedMessage')
      this.protobuf = FeedMessage
      this.scheduleAlertPull()
      this.scheduleUpdatePull()
      this.scheduleVehiclePositionPull()
      logger.info('Realtime Started.')
    }
  }

  stop = () => {
    const { logger } = this
    clearTimeout(this.tripUpdateTimeout)
    clearTimeout(this.vehiclePositionTimeout)
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
      axios,
      tripUpdateEndpoint,
      redis,
      scheduleUpdatePull,
      scheduleUpdatePullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    logger.info('Starting Trip Update Pull')

    try {
      const res = await axios.get(`${tripUpdateEndpoint}`)
      const oldModified = await redis.getKey('default', 'last-trip-update')
      if (
        res.headers['last-modified'] !== oldModified ||
        new Date().toISOString() !== oldModified
      ) {
        const uInt8 = new Uint8Array(res.data)
        const _feed = protobuf.decode(uInt8) as unknown
        const feed = _feed as UpdateFeedMessage
        await this.processTripUpdates(feed.entity)

        if (res.headers['last-modified']) {
          await redis.setKey(
            'default',
            res.headers['last-modified'],
            'last-trip-update'
          )
        } else {
          await redis.setKey(
            'default',
            new Date().toISOString(),
            'last-trip-update'
          )
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to pull trip updates')
    }
    logger.info('Pulled Trip Updates.')

    this.tripUpdateTimeout = setTimeout(
      scheduleUpdatePull,
      scheduleUpdatePullTimeout
    )
  }

  scheduleVehiclePositionPull = async () => {
    const {
      logger,
      axios,
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
    logger.info('Starting Vehicle VehiclePosition Pull')
    try {
      const res = await axios.get(`${vehiclePositionEndpoint}`)

      const oldModified = await redis.getKey(
        'default',
        'last-vehicle-position-update'
      )
      if (
        res.headers['last-modified'] !== oldModified ||
        new Date().toISOString() !== oldModified
      ) {
        const uInt8 = new Uint8Array(res.data)
        const _feed = protobuf.decode(uInt8) as unknown
        const feed = _feed as PositionFeedMessage
        this.processVehiclePositions(feed.entity)

        if (res.headers['last-modified']) {
          await redis.setKey(
            'default',
            res.headers['last-modified'],
            'last-vehicle-position-update'
          )
        } else {
          await redis.setKey(
            'default',
            new Date().toISOString(),
            'last-vehicle-position-update'
          )
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to pull vehicle positions')
    }
    logger.info('Pulled Vehicle VehiclePositions')
    this.vehiclePositionTimeout = setTimeout(
      scheduleVehiclePositionPull,
      scheduleVehiclePositionPullTimeout
    )
  }

  scheduleAlertPull = async () => {
    const {
      logger,
      axios,
      serviceAlertEndpoint,
      redis,
      scheduleAlertPull,
      scheduleAlertPullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    logger.info('Starting Service Alert Pull')

    try {
      const res = await axios.get(`${serviceAlertEndpoint}`)

      const oldModified = await redis.getKey('default', 'last-alert-update')
      if (res.headers['last-modified'] !== oldModified) {
        const uInt8 = new Uint8Array(res.data)
        const _feed = protobuf.decode(uInt8) as unknown
        const feed = _feed as AlertFeedMessage
        await this.processAlerts(feed.entity)
        if (res.headers['last-modified']) {
          await redis.setKey(
            'default',
            res.headers['last-modified'],
            'last-alert-update'
          )
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to pull  service alert')
    }

    await redis.setKey('default', new Date().toISOString(), 'last-trip-update')
    logger.info('Pulled Service Alert Updates.')

    this.tripUpdateTimeout = setTimeout(
      scheduleAlertPull,
      scheduleAlertPullTimeout
    )
  }
}

export default SingleEndpoint
