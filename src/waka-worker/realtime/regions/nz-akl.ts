import * as Logger from 'bunyan'
import { Response } from 'express'
import { VarChar } from 'mssql'
import doubleDeckers from './nz-akl-doubledecker.json'
import Connection from '../../db/connection'
import { WakaRequest, RedisConfig } from '../../../typings'
import BaseRealtime from '../../../types/BaseRealtime'
import WakaRedis from '../../../waka-realtime/Redis'
import { TripUpdate } from '../../../gtfs'

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
      logger.info('Realtime Gateway started')
    }
  }

  stop = () => {
    this.logger.info('Auckland Realtime stopped.')
  }

  getTripsEndpoint = async (
    req: WakaRequest<
      { trips: string[]; train: boolean; stop_id: string },
      null
    >,
    res: Response
  ) => {
    interface ExTripUpdate extends TripUpdate {
      specialVehicle: { ev: boolean; dd: boolean }
    }
    interface TrainTripUpdate {
      v_id: string
      latitude: number
      longitude: number
    }
    const { trips, train } = req.body
    const realtimeInfo: {
      [tripId: string]: ExTripUpdate | TrainTripUpdate
    } = {}
    if (train) {
      for (const tripId of trips) {
        try {
          const data = await this.wakaRedis.getVehiclePosition(tripId)
          if (data) {
            realtimeInfo[data.trip.tripId] = {
              v_id: data.vehicle.id,
              latitude: data.position.latitude,
              longitude: data.position.longitude,
            }
          }
        } catch (err) {
          console.log(err)
        }
      }
    } else {
      for (const tripId of trips) {
        try {
          const data = await this.wakaRedis.getTripUpdate(tripId)
          if (data) {
            realtimeInfo[tripId] = {
              ...data,
              specialVehicle: this.isSpecialVehicle(data.vehicle.id),
            }
          }
        } catch (error) {
          console.log(error)
        }
      }
    }
    return res.send(realtimeInfo)
  }

  getVehicleLocationEndpoint = async (
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ) => {
    const { logger } = this
    const { trips } = req.body
    const vehicleInfo: {
      [tripId: string]: { latitude: number; longitude: number }
    } = {}
    for (const tripId of trips) {
      try {
        const data = await this.wakaRedis.getVehiclePosition(tripId)
        if (data) {
          vehicleInfo[tripId] = {
            latitude: data.position.latitude,
            longitude: data.position.longitude,
          }
        }
      } catch (err) {
        console.log(err)
      }
    }
    return res.send(vehicleInfo)
  }

  getLocationsForLine = async (
    req: WakaRequest<null, { line: string }>,
    res: Response
  ) => {
    const { logger, connection } = this
    const { line } = req.params
    // const keys = await this.wakaRedis.client.keys('*nz-akl:vehicle-position*')
    // if (keys.length === 0) {
    //   return res.send([])
    // }

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
      const escapedTripIds = `'${tripIds.join('\', \'')}'`
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
      debugger
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
      return res.send(result)
    } catch (err) {
      logger.error({ err }, 'Could not get locations from line.')
      return res.status(500).send(err)
    }
  }
}
export default RealtimeNZAKL
