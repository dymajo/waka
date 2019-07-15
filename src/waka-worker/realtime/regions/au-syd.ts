import { Response } from 'express'
import { VarChar } from 'mssql'

import Connection from '../../db/connection'
import { WakaRequest, Logger, RedisConfig } from '../../../typings'

import BaseRealtime from '../../../types/BaseRealtime'
import Redis from '../../../waka-realtime/Redis'
import { TripUpdate } from '../../../gtfs'

interface RealtimeAUSYDProps {
  connection: Connection
  logger: Logger
  newRealtime: boolean
  redisConfig: RedisConfig
}

class RealtimeAUSYD extends BaseRealtime {
  redis: Redis
  newRealtime: boolean

  constructor(props: RealtimeAUSYDProps) {
    super()
    const { connection, logger, newRealtime, redisConfig } = props
    this.redis = new Redis({ prefix: 'au-syd', logger, config: redisConfig })
    this.newRealtime = newRealtime
    this.connection = connection
    this.logger = logger
  }

  start = async () => {
    const { logger, newRealtime } = this

    if (!newRealtime) {
      logger.error('Must be new realtime')
    } else {
      this.redis.start()
      logger.info('Realtime Gateway started')
    }
  }

  stop = () => {
    // TODO!
    this.logger.warn('Sydney Realtime Not Stopped! Not Implemented.')
  }

  getTripsEndpoint = async (
    req: WakaRequest<{ trips: string[]; stop_id: string }, null>,
    res: Response
  ) => {
    const { trips, stop_id } = req.body
    const realtimeInfo: { [tripId: string]: TripUpdate } = {}
    for (const tripId of trips) {
      try {
        const data = await this.redis.getTripUpdate(tripId)

        realtimeInfo[tripId] = data
      } catch (error) {
        console.log(error)
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
    for (const tripId in trips) {
      if (Object.prototype.hasOwnProperty.call(trips, tripId)) {
        const element = trips[tripId]
        try {
          const data = await this.redis.getVehiclePosition(tripId)
          vehicleInfo[tripId] = {
            latitude: data.position.latitude,
            longitude: data.position.longitude,
          }
        } catch (err) {
          console.log(err)
        }
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
        const t = await this.redis.getArrayKey(
          routeId,
          'vehicle-position-route'
        )
        tripIds = [...tripIds, ...t]
      }

      const trips = await Promise.all(
        tripIds.map(tripId => this.redis.getVehiclePosition(tripId))
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
      console.log(tripIdRequest.recordset)

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
        console.log(vehicle)
        console.log(tripIdsMap[vehicle.trip.tripId])
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
        }
      })
      return res.send(result)
    } catch (err) {
      logger.error({ err }, 'Could not get locations from line.')
      return res.status(500).send(err)
    }
  }

  getServiceAlertsEndpoint = async (
    req: WakaRequest<
      { routeId?: string; stopId?: string; tripId?: string },
      null
    >,
    res: Response
  ) => {
    const {
      body: { routeId, stopId, tripId },
    } = req
    // const alerts = []
    if (routeId) {
      const alid = await this.redis.getArrayKey(routeId, 'alert-route')
      const alerts = await Promise.all(alid.map(id => this.redis.getAlert(id)))
      return res.send(alerts)
    }
    if (tripId) {
      const alid = await this.redis.getArrayKey(tripId, 'alert-trip')
      const alerts = await Promise.all(alid.map(id => this.redis.getAlert(id)))
      return res.send(alerts)
    }
    if (stopId) {
      const alid = await this.redis.getArrayKey(stopId, 'alert-stop')
      const alerts = await Promise.all(alid.map(id => this.redis.getAlert(id)))
      return res.send(alerts)
    }
    return res.send([])
  }

  // getAllVehicleLocations = async (
  //   req: WakaRequest<null, null>,
  //   res: Response
  // ) => {
  //   const { buses, trains, lightrail, ferries } = req.query
  //   const { connection } = this
  //   if (currentVehicleData.length !== 0) {
  //     const tripIds = currentVehicleData.map(
  //       entity => entity.vehicle.trip.tripId
  //     )
  //     const escapedTripIds = `'${tripIds.join('\', \'')}'`
  //     try {
  //       const sqlTripIdRequest = connection.get().request()
  //       const tripIdRequest = await sqlTripIdRequest.query<{
  //         trip_id: string
  //         route_type: number
  //       }>(`
  // select routes.route_type, trips.trip_id from trips join routes on trips.route_id = routes.route_id where trip_id in (${escapedTripIds})
  // `)
  //       const routeTypes = tripIdRequest.recordset.map(res => ({
  //         trip_id: res.trip_id,
  //         route_type: res.route_type,
  //       }))
  //       const vehicleData = currentVehicleData
  //         .filter(entity => entity.vehicle.position)
  //         .map(entity => ({
  //           latitude: entity.vehicle.position.latitude,
  //           longitude: entity.vehicle.position.longitude,
  //           bearing: entity.vehicle.position.bearing,
  //           updatedAt: this.lastVehicleUpdate,
  //           trip_id: entity.vehicle.trip.tripId,
  //         }))
  //       const result: {
  //         route_type: number
  //         latitude: number
  //         longitude: number
  //         bearing: number
  //         updatedAt: Date
  //         trip_id: string
  //       }[] = []
  //       for (let i = 0; i < routeTypes.length; i++) {
  //         result.push({
  //           ...routeTypes[i],
  //           ...vehicleData.find(
  //             itmInner => itmInner.trip_id === routeTypes[i].trip_id
  //           ),
  //         })
  //       }

  //       result.filter(res => {
  //         switch (res.route_type) {
  //           case 1000:
  //             return ferries === 'true'
  //           case 400:
  //           case 401:
  //           case 2:
  //           case 100:
  //           case 106:
  //             return trains === 'true'
  //           case 900:
  //             return lightrail === 'true'
  //           case 700:
  //           case 712:
  //           case 714:
  //           case 3:
  //             return buses === 'true'
  //           default:
  //             return false
  //         }
  //       })
  //       return res.send(result)
  //     } catch (error) {
  //       //
  //     }
  //   } else {
  //     return res.sendStatus(400)
  //   }
  // }
}

export default RealtimeAUSYD
