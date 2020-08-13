import * as Logger from 'bunyan'
import { Response } from 'express'
import { VarChar } from 'mssql'
import { TripUpdate } from '../../../gtfs'
import BaseRealtime from '../../../types/BaseRealtime'
import { RedisConfig, WakaRequest, WakaVehiclePosition } from '../../../types'
import WakaRedis from '../../../waka-realtime/Redis'
import Connection from '../../db/connection'
import doubleDeckers from './nz-akl-doubledecker.json'

interface RealtimeNZAKLProps {
  connection: Connection
  logger: Logger
  apiKey: string
  newRealtime: boolean
  wakaRedis: WakaRedis
}

class RealtimeNZAKL extends BaseRealtime {
  connection: Connection
  logger: Logger
  newRealtime: boolean
  redisConfig: RedisConfig
  wakaRedis: WakaRedis
  constructor(props: RealtimeNZAKLProps) {
    super()
    const { logger, connection, apiKey, newRealtime, wakaRedis } = props
    this.wakaRedis = wakaRedis
    this.newRealtime = newRealtime
    this.connection = connection
    this.logger = logger
    this.apiKey = apiKey
  }

  isSpecialVehicle = (vehicle: string) => {
    const sv = {
      ev: false,
      dd: false,
    }
    if (['2840', '2841'].includes(vehicle)) {
      sv.ev = true
    }
    if (doubleDeckers.includes(vehicle)) {
      sv.dd = true
    }
    return sv
  }

  start = async () => {
    const { logger, newRealtime } = this

    if (!newRealtime) {
      logger.error('Must be new realtime')
    } else {
      // await this.redis.start()
      logger.info('Realtime Gateway started blah')
    }
  }

  stop = () => {
    this.logger.info('Auckland Realtime stopped. blah')
  }

  getTripsCached = (trips: string[], stop_id: string) => {
    return this.getTrips(trips, false, stop_id)
  }

  getVehicleInfoCached = async (line: string) => {
    const { logger, connection } = this

    try {
      const sqlRouteIdRequest = connection.get().request()
      sqlRouteIdRequest.input('route_short_name', VarChar(50), line)
      const routeIdResult = await sqlRouteIdRequest.query<{ route_id: string }>(
        `
    SELECT route_id
    FROM routes
    WHERE route_short_name = @route_short_name or route_id = @route_short_name
    `
      )
      const routeIds = routeIdResult.recordset.map(r => r.route_id)
      let tripIds: string[] = []
      for (const routeId of routeIds) {
        const t = await this.wakaRedis.getArrayKey(
          routeId,
          'vehicle-position-route'
        )
        tripIds = [...tripIds, ...t]
      }

      const trips = await Promise.all(
        tripIds.map(tripId => this.wakaRedis.getVehiclePosition(tripId))
      )
      const escapedTripIds = `'${tripIds.join("', '")}'`
      const sqlTripIdRequest = connection.get().request()
      const tripIdRequest = await sqlTripIdRequest.query<{
        trip_id: string
        direction_id: number
        trip_headsign: string
        bikes_allowed: number
        block_id: string
        route_id: string
        service_id: string
        shape_id: string
        trip_short_name: string
        wheelchair_accessible: number
      }>(`
      SELECT *
      FROM trips
      WHERE trip_id IN (${escapedTripIds})
    `)
      // console.log(tripIdRequest.recordset)

      const tripIdsMap: {
        [tripId: string]: {
          trip_id: string
          direction_id: number
          trip_headsign: string
          bikes_allowed: number
          block_id: string
          route_id: string
          service_id: string
          shape_id: string
          trip_short_name: string
          wheelchair_accessible: number
        }
      } = {}
      tripIdRequest.recordset.forEach(record => {
        tripIdsMap[record.trip_id] = record
      })
      // now we return the structued data finally
      const result = trips.map(vehicle => {
        // console.log(vehicle)
        // console.log(tripIdsMap[vehicle.trip.tripId])
        return {
          latitude: vehicle.position.latitude,
          longitude: vehicle.position.longitude,
          bearing: vehicle.position.bearing,
          direction: tripIdsMap[vehicle.trip.tripId].direction_id,
          stopId: vehicle.stopId,
          congestionLevel: vehicle.congestionLevel,
          updatedAt: this.lastVehicleUpdate,
          trip_id: vehicle.trip.tripId,
          label: vehicle.vehicle.label,
          occupancyStatus: vehicle.occupancyStatus,
        }
      })
      return result
    } catch (err) {
      throw Error(err)
    }
  }

  getTripsEndpoint = async (
    req: WakaRequest<
      { trips: string[]; train: boolean; stop_id: string },
      null
    >,
    res: Response
  ) => {
    const { trips, train, stop_id } = req.body
    try {
      const data = await this.getTrips(trips, train, stop_id)
      return res.send(data)
    } catch (err) {
      this.logger.error(err)
      return res.status(500).send({ err })
    }
  }

  getTrips = async (rawTrips: string[], train: boolean, stop_id: string) => {
    interface ExTripUpdate extends TripUpdate {
      specialVehicle: { ev: boolean; dd: boolean }
      stop_sequence: number
    }
    const realtimeInfo: {
      [tripId: string]: ExTripUpdate | WakaVehiclePosition
    } = {}
    let trips = rawTrips
    if (!Array.isArray(trips)) {
      trips = Object.keys(trips)
    }
    if (train) {
      for (const tripId of trips) {
        const data = await this.wakaRedis.getVehiclePosition(tripId)
        if (data) {
          const tripId = data?.trip?.tripId ?? ''
          const vehicleId = data?.vehicle?.id
          const latitude = data?.position?.latitude ?? 0
          const longitude = data?.position?.longitude ?? 0
          realtimeInfo[tripId] = {
            v_id: vehicleId,
            latitude,
            longitude,
          }
        }
      }
    } else {
      for (const tripId of trips) {
        const data = await this.wakaRedis.getTripUpdate(tripId)
        const vehicleId = data?.vehicle?.id
        const stopTimeUpdate = data?.stopTimeUpdate ?? []

        if (stopTimeUpdate.length > 0) {
          const targetStop =
            stopTimeUpdate.find(stopUpdate => stopUpdate.stopId === stop_id) ||
            stopTimeUpdate[0]
          if (data && vehicleId && targetStop) {
            realtimeInfo[tripId] = {
              ...data,
              delay: targetStop?.departure?.delay ?? targetStop?.arrival?.delay,
              stop_sequence: targetStop?.stopSequence as number,
              specialVehicle: this.isSpecialVehicle(vehicleId),
            }
          }
        }
      }
    }
    return realtimeInfo
  }

  getLocationsForLine = async (
    req: WakaRequest<null, { line: string }>,
    res: Response
  ) => {
    try {
      const {
        params: { line },
      } = req
      const lineinfo = await this.getVehicleInfoCached(line)
      return res.send(lineinfo)
    } catch (error) {
      return res.status(500).send('Could not get locations from line.')
    }
  }
}
export default RealtimeNZAKL
