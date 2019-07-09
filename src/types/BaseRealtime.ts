import { Response } from 'express'
import Connection from '../waka-worker/db/connection'
import { WakaRequest, Logger } from '../typings'

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

  getTripsCached?(
    trips: string[]
  ): {
    [tripId: string]: {
      stop_sequence: number
      delay: number
      timestamp: number
      v_id: number
      double_decker: boolean
      ev: boolean
    }
  }
  abstract scheduleLocationPull(): Promise<void>
  abstract scheduleUpdatePull(): Promise<void>
  getAllVehicleLocations?(
    req: WakaRequest<null, null>,
    res: Response
  ): Promise<Response>
  abstract start(): void
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
