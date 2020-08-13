import Protobuf from 'protobufjs'
import { AlertFeedMessage, PositionFeedMessage, UpdateFeedMessage } from '../gtfs'
import BaseRealtime, { BaseRealtimeProps, PROTOBUF_PATH } from './BaseRealtime'

export interface SingleEndpointProps extends BaseRealtimeProps {
  vehiclePositionEndpoint: string
  tripUpdateEndpoint: string
  serviceAlertEndpoint: string
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

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
      this.isPullActive = true
      this.scheduleAlertPull()
      this.scheduleUpdatePull()
      this.scheduleVehiclePositionPull()
      logger.info('Realtime Started.')
    }
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
      wakaRedis,
      scheduleUpdatePullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    while (this.isPullActive) {
      logger.info('Starting Trip Update Pull')
      try {
        const res = await axios.get(`${tripUpdateEndpoint}`)
        const oldModified = await wakaRedis.getKey(
          'default',
          'last-trip-update'
        )
        if (
          res.headers['last-modified'] !== oldModified ||
          new Date().toISOString() !== oldModified
        ) {
          const uInt8 = new Uint8Array(res.data)
          const _feed = protobuf.decode(uInt8) as unknown
          const feed = _feed as UpdateFeedMessage
          await this.processTripUpdates(feed.entity)

          if (res.headers['last-modified']) {
            await wakaRedis.setKey(
              'default',
              res.headers['last-modified'],
              'last-trip-update'
            )
          } else {
            await wakaRedis.setKey(
              'default',
              new Date().toISOString(),
              'last-trip-update'
            )
          }
          logger.info(
            { tripUpdatesCount: feed.entity.length },
            'Pulled Trip Updates.'
          )
        } else {
          logger.info(
            { lastModified: oldModified },
            'Trip Updates not Modified'
          )
        }
      } catch (err) {
        logger.error({ err }, 'Failed to pull trip updates')
      }
      await sleep(scheduleUpdatePullTimeout)
    }
  }

  scheduleVehiclePositionPull = async () => {
    const {
      logger,
      axios,
      wakaRedis,
      scheduleVehiclePositionPullTimeout,
      vehiclePositionEndpoint,
      setupProtobuf,
      protobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    while (this.isPullActive) {
      logger.info('Starting Vehicle Position Pull')
      try {
        const res = await axios.get(`${vehiclePositionEndpoint}`)
        const oldModified = await wakaRedis.getKey(
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
            await wakaRedis.setKey(
              'default',
              res.headers['last-modified'],
              'last-vehicle-position-update'
            )
          } else {
            await wakaRedis.setKey(
              'default',
              new Date().toISOString(),
              'last-vehicle-position-update'
            )
          }
          logger.info(
            { vehiclePositionsCount: feed.entity.length },
            'Pulled VehiclePositions'
          )
        } else {
          logger.info(
            { lastModified: oldModified },
            'Vehicle Positions not Modified'
          )
        }
      } catch (err) {
        logger.error({ err }, 'Failed to pull vehicle positions')
      }
      await sleep(scheduleVehiclePositionPullTimeout)
    }
  }

  scheduleAlertPull = async () => {
    const {
      logger,
      axios,
      serviceAlertEndpoint,
      wakaRedis,
      scheduleAlertPullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    while (this.isPullActive) {
      logger.info('Starting Service Alert Pull')
      try {
        const res = await axios.get(`${serviceAlertEndpoint}`)

        const oldModified = await wakaRedis.getKey(
          'default',
          'last-alert-update'
        )
        if (
          res.headers['last-modified'] !== oldModified ||
          new Date().toISOString() !== oldModified
        ) {
          const uInt8 = new Uint8Array(res.data)
          const _feed = protobuf.decode(uInt8) as unknown
          const feed = _feed as AlertFeedMessage
          await this.processAlerts(feed.entity)
          if (res.headers['last-modified']) {
            await wakaRedis.setKey(
              'default',
              res.headers['last-modified'],
              'last-alert-update'
            )
          } else {
            await wakaRedis.setKey(
              'default',
              new Date().toISOString(),
              'last-alert-update'
            )
          }
          logger.info(
            { serviceAlertCount: feed.entity.length },
            'Pulled Service Alert Updates.'
          )
        } else {
          logger.info(
            { lastModified: oldModified },
            'Service Alerts not Modified'
          )
        }
      } catch (err) {
        logger.error({ err }, 'Failed to pull service alerts')
      }
      await sleep(scheduleAlertPullTimeout)
    }
  }
}

export default SingleEndpoint
