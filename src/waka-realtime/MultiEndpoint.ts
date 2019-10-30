import Protobuf from 'protobufjs'
import BaseRealtime, { BaseRealtimeProps, PROTOBUF_PATH } from './BaseRealtime'
import {
  PositionFeedMessage,
  UpdateFeedMessage,
  AlertFeedMessage,
} from '../gtfs'

export interface MultiEndpointProps extends BaseRealtimeProps {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  modes: Array<(agency?: boolean) => string>
  tripUpdateEndpoint: string
  vehiclePositionEndpoint: string
  serviceAlertEndpoint: string
}

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))

abstract class MultiEndpoint extends BaseRealtime {
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  protobuf: protobuf.Type
  modes: ((agency?: boolean) => string)[]
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
      this.isPullActive = true
      this.scheduleAlertPull()
      this.scheduleUpdatePull()
      this.scheduleVehiclePositionPull()
    }
  }

  setupProtobuf = async () => {
    if (!this.protobuf) {
      const pb = await Protobuf.load(PROTOBUF_PATH)
      const FeedMessage = pb.lookupType('transit_realtime.FeedMessage')
      this.protobuf = FeedMessage
    }
  }

  getFromFile = async () => {}

  scheduleUpdatePull = async () => {
    const {
      logger,
      modes,
      axios,
      tripUpdateEndpoint,
      wakaRedis,
      rateLimiter,
      scheduleUpdatePullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    while (this.isPullActive) {
      logger.info('Starting Trip Update Pull')
      for (const mode of modes) {
        try {
          const res = await rateLimiter(() =>
            axios.get(`${tripUpdateEndpoint}/${mode()}`)
          )
          const oldModified = await wakaRedis.getKey(mode(), 'last-trip-update')
          if (res.headers['last-modified'] !== oldModified) {
            const uInt8 = new Uint8Array(res.data)
            const _feed = protobuf.decode(uInt8) as unknown
            const feed = _feed as UpdateFeedMessage
            await this.processTripUpdates(feed.entity)

            if (res.headers['last-modified']) {
              await wakaRedis.setKey(
                mode(),
                res.headers['last-modified'],
                'last-trip-update'
              )
            }
          }
        } catch (err) {
          logger.error({ err }, 'Failed to pull trip updates')
        }
      }

      await wakaRedis.setKey(
        'default',
        new Date().toISOString(),
        'last-trip-update'
      )
      logger.info('Pulled Trip Updates.')
      await sleep(scheduleUpdatePullTimeout)
    }
  }

  scheduleVehiclePositionPull = async () => {
    const {
      logger,
      modes,
      axios,
      rateLimiter,
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
      for (const mode of modes) {
        try {
          const res = await rateLimiter(() =>
            axios.get(`${vehiclePositionEndpoint}/${mode()}`)
          )
          const oldModified = await wakaRedis.getKey(
            mode(),
            'last-vehicle-position-update'
          )
          if (res.headers['last-modified'] !== oldModified) {
            const uInt8 = new Uint8Array(res.data)
            const _feed = protobuf.decode(uInt8) as unknown
            const feed = _feed as PositionFeedMessage
            await this.processVehiclePositions(feed.entity)
            if (res.headers['last-modified']) {
              await wakaRedis.setKey(
                mode(),
                res.headers['last-modified'],
                'last-vehicle-position-update'
              )
            }
          }
        } catch (err) {
          logger.error({ err }, 'Failed to pull vehicle positions')
        }
      }
      await wakaRedis.setKey(
        'default',
        new Date().toISOString(),
        'last-vehicle-position-update'
      )
      logger.info('Pulled Vehicle Locations')
      await sleep(scheduleVehiclePositionPullTimeout)
    }
  }

  scheduleAlertPull = async () => {
    const {
      logger,
      modes,
      axios,
      serviceAlertEndpoint,
      wakaRedis,
      rateLimiter,
      scheduleAlertPullTimeout,
      protobuf,
      setupProtobuf,
    } = this
    if (!protobuf) {
      await setupProtobuf()
    }
    while (this.isPullActive) {
      logger.info('Starting Service Alert Pull')
      for (let i = 0; i < modes.length; i++) {
        const mode = modes[i]
        // work around for sfo single alert endpoint
        if (i > 0 && mode(false) === modes[i - 1](false)) {
          break
        }
        try {
          const res = await rateLimiter(() =>
            axios.get(`${serviceAlertEndpoint}/${mode(false)}`)
          )
          const oldModified = await wakaRedis.getKey(
            mode(false),
            'last-alert-update'
          )
          if (res.headers['last-modified'] !== oldModified) {
            const uInt8 = new Uint8Array(res.data)
            const _feed = protobuf.decode(uInt8) as unknown
            const feed = _feed as AlertFeedMessage
            await this.processAlerts(feed.entity)

            if (res.headers['last-modified']) {
              await wakaRedis.setKey(
                mode(false),
                res.headers['last-modified'],
                'last-alert-update'
              )
            }
          }
        } catch (err) {
          // logger.error({ err }, `Failed to pull ${mode} service alert`)
        }
      }

      await wakaRedis.setKey(
        'default',
        new Date().toISOString(),
        'last-trip-update'
      )
      logger.info('Pulled Service Alert Updates.')
      await sleep(scheduleAlertPullTimeout)
    }
  }
}

export default MultiEndpoint
