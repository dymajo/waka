import { Response } from 'express'
import { VarChar } from 'mssql'
import { oc } from 'ts-optchain'
import Connection from '../../db/connection'
import { WakaRequest, Logger, RedisConfig } from '../../../typings'

import BaseRealtime from '../../../types/BaseRealtime'
import { TripUpdate } from '../../../gtfs'
import WakaRedis from '../../../waka-realtime/Redis'

interface RealtimeAUSYDProps {
  connection: Connection
  logger: Logger
  newRealtime: boolean
  wakaRedis: WakaRedis
}

class RealtimeAUSYD extends BaseRealtime {
  wakaRedis: WakaRedis
  newRealtime: boolean

  constructor(props: RealtimeAUSYDProps) {
    super()
    const { connection, logger, newRealtime, wakaRedis } = props
    this.wakaRedis = wakaRedis
    this.newRealtime = newRealtime
    this.connection = connection
    this.logger = logger
  }

  start = async () => {
    const { logger, newRealtime } = this

    if (!newRealtime) {
      logger.error('Must be new realtime')
    } else {
      // await this.wakaRedis.start()
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
        const data = await this.wakaRedis.getTripUpdate(tripId)
        if (data) {
          realtimeInfo[tripId] = data
        }
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
    for (const tripId of trips) {
        try {
          const data = await this.wakaRedis.getVehiclePosition(tripId)
          vehicleInfo[tripId] = {
            latitude: data.position.latitude,
            longitude: data.position.longitude,
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

    // const keys = await this.wakaRedis.client.keys('*au-syd:vehicle-position*')
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
      const result = vehiclePostions
        .filter(vp => vp)
        .map(vehiclePosition => {
          console.log(vehiclePosition)
          const latitude = oc(vehiclePosition).position.latitude()
          const longitude = oc(vehiclePosition).position.longitude()
          const bearing = oc(vehiclePosition).position.bearing()
          const speed = oc(vehiclePosition).position.speed()
          const stopId = oc(vehiclePosition).stopId()
          const currentStopSequence = oc(vehiclePosition).currentStopSequence()
          const congestionLevel = oc(vehiclePosition).congestionLevel()
          const tripId = oc(vehiclePosition).trip.tripId()
          const label = oc(vehiclePosition).vehicle.label()
          const airConditioned = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].airConditioned()
          const performingPriorTrip = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].performingPriorTrip()
          const specialVehicleAttributes = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].specialVehicleAttributes()
          const vehicleModel = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].vehicleModel()
          const wheelChairAccessible = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].wheelChairAccessible()
          const split = tripId.split('.')
          const [
            run,
            timetableId,
            timetableVersion,
            dopRef,
            type,
            cars,
            instance,
          ] = split.length === 7 ? split : new Array(7)
        return {
            latitude,
            longitude,
            bearing,
            speed,
          // direction: tripIdsMap[vehicle.trip.tripId].direction_id,
            stopId,
            congestionLevel,
            currentStopSequence,
          updatedAt: this.lastVehicleUpdate,
            trip_id: tripId,
            label,
            extraInfo: {
              airConditioned,
              performingPriorTrip,
              specialVehicleAttributes,
              vehicleModel,
              wheelChairAccessible,
              cars,
              type,
              run,
            },
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
      const alid = await this.wakaRedis.getArrayKey(routeId, 'alert-route')
      const alerts = await Promise.all(
        alid.map(id => this.wakaRedis.getAlert(id))
      )
      return res.send(alerts)
    }
    if (tripId) {
      const alid = await this.wakaRedis.getArrayKey(tripId, 'alert-trip')
      const alerts = await Promise.all(
        alid.map(id => this.wakaRedis.getAlert(id))
      )
      return res.send(alerts)
    }
    if (stopId) {
      const alid = await this.wakaRedis.getArrayKey(stopId, 'alert-stop')
      const alerts = await Promise.all(
        alid.map(id => this.wakaRedis.getAlert(id))
      )
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
