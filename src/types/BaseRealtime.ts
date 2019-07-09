import { Response } from 'express'
import Connection from '../waka-worker/db/connection'
import { WakaRequest, Logger } from '../typings'
export default abstract class BaseRealtime {
  connection: Connection
  logger: Logger
  lastUpdate: Date
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
  scheduleLocationPull?(): Promise<void>
  schedulePull?(): Promise<void>
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
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ): Promise<Response>
  abstract getTripsEndpoint(
    req: WakaRequest<{ trips: string[]; train: boolean }, null>,
    res: Response
  ): Promise<Response>
  abstract getTripsEndpoint(
    req: WakaRequest<
      {
        trips: string[]
        stop_id: string
      },
      null
    >,
    res: Response
  ): Promise<Response>
}