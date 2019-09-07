import Protobuf from 'protobufjs'
import {
  FeedMessage,
  AlertFeedEntity,
  UpdateFeedEntity,
  PositionFeedEntity,
} from '../gtfs'
import BaseRealtime, { PROTOBUF_PATH, BaseRealtimeProps } from './BaseRealtime'
import SingleEndpoint from './SingleEndpoint'

export interface MultiEndpointProps extends BaseRealtimeProps {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  modes: string[]
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

abstract class MultiCombinedFeed extends BaseRealtime {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  protobuf: protobuf.Type
  modes: string[]
  tripUpdateEndpoint: string
  vehiclePositionEndpoint: string
  serviceAlertEndpoint: string

  constructor(props: MultiEndpointProps) {
    super(props)
    this.modes = props.modes
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
      this.isPullActive = true
      this.scheduleUpdatePull()
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
      redis,
      scheduleUpdatePullTimeout,
      protobuf,
      setupProtobuf,
      modes,
      rateLimiter,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    while (this.isPullActive) {
      logger.info('Starting Trip Update Pull')
      for (const mode of modes) {
        try {
          const res = await rateLimiter(() => axios.get(mode))
          const oldModified = await redis.getKey('default', 'last-trip-update')
          if (
            res.headers['last-modified'] !== oldModified ||
            new Date().toISOString() !== oldModified
          ) {
            const uInt8 = new Uint8Array(res.data)
            const _feed = protobuf.decode(uInt8) as unknown
            const feed = _feed as FeedMessage
            const alerts: AlertFeedEntity[] = []
            const tripUpdates: UpdateFeedEntity[] = []
            const vehiclePositions: PositionFeedEntity[] = []
            for (const entity of feed.entity) {
              if (entity.vehicle) {
                // const ne: PositionFeedEntity = entity as PositionFeedEntity
                vehiclePositions.push(entity as PositionFeedEntity)
              }
              if (entity.alert) {
                alerts.push(entity as AlertFeedEntity)
              }
              if (entity.tripUpdate) {
                tripUpdates.push(entity as UpdateFeedEntity)
              }
            }
            await this.processTripUpdates(tripUpdates)
            await this.processAlerts(alerts)
            await this.processVehiclePositions(vehiclePositions)

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
          console.log(mode)
          logger.error({ err }, 'Failed to pull trip updates')
        }
      }
      logger.info('Pulled Trip Updates.')
      await sleep(scheduleUpdatePullTimeout)
    }
  }
}

export default MultiCombinedFeed
