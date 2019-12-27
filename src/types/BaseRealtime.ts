import { Response } from 'express'
import { Logger, WakaRequest, WakaTripUpdate, WakaVehicleInfo, WakaVehiclePosition } from '../types'
import Connection from '../waka-worker/db/connection'

export default abstract class BaseRealtime {
  connection: Connection
  logger: Logger
  apiKey: string

  lastTripUpdate: Date
  lastVehicleUpdate: Date

  currentUpdateDataFails: number
  currentVehicleDataFails: number

  scheduleUpdatePullTimeout: number
  scheduleLocationPullTimeout: number

  tripUpdateTimeout: NodeJS.Timer
  vehicleTimeout: NodeJS.Timer

  tripUpdateOptions: {
    url: string
    headers?: any
  }
  vehicleLocationOptions: {
    url: string
    headers?: any
  }
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>

  abstract getTripsCached(
    trips: string[],
    stop_id: string,
    train: boolean
  ): Promise<{
    [tripId: string]: WakaTripUpdate
  }>
  abstract getVehiclePositionsCached(
    trips: string[]
  ): Promise<{
    [tripId: string]: WakaVehiclePosition
  }>
  abstract getVehicleInfoCached(line: string): Promise<WakaVehicleInfo[]>
  getServiceAlertsEndpoint?(
    req: WakaRequest<
      { routeId?: string; stopId?: string; tripId?: string },
      null
    >,
    res: Response
  ): Promise<Response>

  scheduleLocationPull?(): Promise<void>
  scheduleUpdatePull?(): Promise<void>
  getAllVehicleLocations?(
    req: WakaRequest<null, null>,
    res: Response
  ): Promise<Response>
  abstract start(): Promise<void>
  abstract stop(): void
  abstract getVehicleLocationEndpoint(
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ): Promise<Response>
  abstract getLocationsForLine(
    req: WakaRequest<null, { line: string }>,
    res: Response
  ): Promise<Response>

  abstract getTripsEndpoint(
    req: WakaRequest<
      { trips: string[]; train: boolean; stop_id: string },
      null
    >,
    res: Response
  ): Promise<Response>
}
