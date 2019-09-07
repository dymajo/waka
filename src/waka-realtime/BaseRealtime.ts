import path from 'path'
import { AxiosInstance } from 'axios'
import WakaRedis from './Redis'
import { Logger } from '../typings'
import {
  VehiclePosition,
  AlertFeedEntity,
  PositionFeedEntity,
  UpdateFeedEntity,
} from '../gtfs'
import { check } from '../utils'

export const PROTOBUF_PATH = [
  path.join(__dirname, 'protos', 'gtfs-realtime.proto'),
  path.join(__dirname, 'protos', 'tfnsw-realtime.proto'),
  path.join(__dirname, 'protos', 'tfnsw-realtime-mnw-nlr.proto'),
  path.join(__dirname, 'protos', 'nyct-subway.proto'),
  path.join(__dirname, 'protos', 'gtfs-realtime-MNR.proto'),
]

export interface BaseRealtimeProps {
  apiKey?: string
  apiKeyRequired?: boolean

  wakaRedis: WakaRedis
  logger: Logger
  axios: AxiosInstance
  scheduleUpdatePullTimeout?: number
  scheduleVehiclePositionPullTimeout?: number
  scheduleAlertPullTimeout?: number

  // vehiclePositionEndpoint: string
  // tripUpdateEndpoint: string
  // serviceAlertEndpoint: string
}

export default abstract class BaseRealtime {
  scheduleUpdatePullTimeout: number
  scheduleVehiclePositionPullTimeout: number
  scheduleAlertPullTimeout: number

  // vehiclePositionEndpoint: string
  // tripUpdateEndpoint: string
  // serviceAlertEndpoint: string

  abstract scheduleUpdatePull(): Promise<void>
  scheduleVehiclePositionPull?(): Promise<void>
  scheduleAlertPull?(): Promise<void>

  logger: Logger
  axios: AxiosInstance
  wakaRedis: WakaRedis
  protobuf: protobuf.Type
  isPullActive: boolean

  apiKey?: string

  apiKeyRequired?: boolean
  abstract start(rateLimiter?: <T>(fn: () => Promise<T>) => Promise<T>): void
  constructor(props: BaseRealtimeProps) {
    const { apiKey, apiKeyRequired } = props
    if (apiKeyRequired && !apiKey) {
      throw Error('api key required')
    }
    this.wakaRedis = props.wakaRedis
    this.apiKey = props.apiKey
    this.logger = props.logger
    this.axios = props.axios
    this.scheduleUpdatePullTimeout = props.scheduleUpdatePullTimeout || 15000
    this.scheduleVehiclePositionPullTimeout =
      props.scheduleVehiclePositionPullTimeout || 15000
    this.scheduleAlertPullTimeout = props.scheduleAlertPullTimeout || 15000
    this.apiKeyRequired = props.apiKeyRequired || false
    this.isPullActive = true
    // this.vehiclePositionEndpoint = props.vehiclePositionEndpoint
    // this.tripUpdateEndpoint = props.tripUpdateEndpoint
    // this.serviceAlertEndpoint = props.serviceAlertEndpoint
  }

  stop = () => {
    const { logger } = this
    this.isPullActive = false
    logger.info('Realtime Stopped.')
  }

  sendArray = async (
    object: object,
    type:
      | 'alert-route'
      | 'alert-route-type'
      | 'alert-trip'
      | 'alert-stop'
      | 'vehicle-position-route'
  ) => {
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        await this.wakaRedis.setKey(key, object[key].toString(), type)
      }
    }
  }

  addVehiclePosition = async (
    tripId: string,
    vehiclePosition: VehiclePosition
  ) => {
    await this.wakaRedis.setKey(
      tripId,
      JSON.stringify(vehiclePosition),
      'vehicle-position'
    )
  }

  processVehiclePositions = async (
    vehiclePositionEntities: PositionFeedEntity[]
  ) => {
    const routes: { [routeId: string]: string[] } = {}
    for (const trip of vehiclePositionEntities) {
      if (trip.vehicle.trip.tripId) {
        check<string>(
          routes,
          trip.vehicle.trip.routeId || 'route_id_unknown',
          trip.vehicle.trip.tripId
        )

        await this.addVehiclePosition(trip.vehicle.trip.tripId, trip.vehicle)
      }
    }
    await this.sendArray(routes, 'vehicle-position-route')
  }

  processTripUpdates = async (updateFeedEntities: UpdateFeedEntity[]) => {
    for (const trip of updateFeedEntities) {
      await this.wakaRedis.setKey(
        trip.tripUpdate.trip.tripId,
        JSON.stringify(trip.tripUpdate),
        'trip-update'
      )
    }
  }

  processAlerts = async (alertFeedEntities: AlertFeedEntity[]) => {
    const routes: { [routeId: string]: string[] } = {}
    const routeTypes: { [routeType: string]: string[] } = {}
    // const agencies: { [agencyId: string]: string[] } = {}
    const trips: { [tripId: string]: string[] } = {}
    const stops: { [stopId: string]: string[] } = {}

    for (const entity of alertFeedEntities) {
      await this.wakaRedis.setKey(
        entity.id,
        JSON.stringify(entity.alert),
        'alert'
      )

      entity.alert.informedEntity.forEach(informed => {
        const { id: alertId } = entity
        if (informed.routeId) {
          check<string>(routes, informed.routeId, alertId)
        }
        if (informed.trip && informed.trip.tripId) {
          check<string>(trips, informed.trip.tripId, alertId)
        }
        if (informed.stopId) {
          check<string>(stops, informed.stopId, alertId)
        }
        if (informed.routeType) {
          check<string>(routeTypes, informed.routeType.toString(10), alertId)
        }
      })
    }
    await this.sendArray(routeTypes, 'alert-route-type')
    await this.sendArray(routes, 'alert-route')
    await this.sendArray(trips, 'alert-trip')
    await this.sendArray(stops, 'alert-stop')
  }
}
