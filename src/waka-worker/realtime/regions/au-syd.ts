import { Response } from 'express'
import { VarChar } from 'mssql'
import { oc } from 'ts-optchain'
import Connection from '../../db/connection'
import {
  WakaRequest,
  Logger,
  WakaTripUpdate,
  WakaVehicleInfo,
} from '../../../typings'

import BaseRealtime from '../../../types/BaseRealtime'
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

  getTripsCached = async (trips: string[], stop_id: string) => {
    const realtimeInfo: { [tripId: string]: WakaTripUpdate } = {}
    for (const tripId of trips) {
      try {
        const data = await this.wakaRedis.getTripUpdate(tripId)
        if (data !== undefined) {
          const stopTimeUpdate = oc(data).stopTimeUpdate([])
          if (stopTimeUpdate.length > 0) {
            const targetStop = stopTimeUpdate.find(
              stopUpdate => stopUpdate.stopId === stop_id
            )
            if (targetStop) {
              const stop_sequence = oc(targetStop).stopSequence()
              const info = {}
              Object.assign(
                info,
                { stop_sequence },
                targetStop.departure && {
                  delay: targetStop.departure.delay,
                  timestamp: targetStop.departure.time || data.timestamp,
                }
              )

              realtimeInfo[tripId] = info
            }

            // return values:
            // delay is added to the scheduled time to figure out the actual stop time
            // timestamp is epoch scheduled time (according to the GTFS-R API)
            // stop_sequence is the stop that the vechicle is currently at
          }
        }
      } catch (error) {
        console.log(error)
      }
    }
    return realtimeInfo
  }

  getVehiclePositionsCached = async (trips: string[]) => {
    const vehicleInfo: {
      [tripId: string]: { latitude: number; longitude: number }
    } = {}
    for (const tripId of trips) {
      try {
        const data = await this.wakaRedis.getVehiclePosition(tripId)
        const latitude = oc(data).position.latitude()
        const longitude = oc(data).position.longitude()
        if (longitude && latitude) {
          vehicleInfo[tripId] = {
            latitude,
            longitude,
          }
        }
      } catch (err) {
        console.log(err)
      }
    }
    return vehicleInfo
  }

  getVehicleInfoCached = async (
    line: string,
    route_id?: string,
    agency_id?: string
  ) => {
    const { logger, connection } = this
    let routeIds
    try {
      if (!route_id) {
        const sqlRouteIdRequest = connection.get().request()
        sqlRouteIdRequest.input('route_short_name', VarChar(50), line)
        const routeIdResult = await sqlRouteIdRequest.query<{
          route_id: string
        }>(
          `
          SELECT route_id
          FROM routes
          WHERE route_short_name = @route_short_name or route_id = @route_short_name
          `
        )
        routeIds = routeIdResult.recordset.map(r => r.route_id)
      } else {
        routeIds = [route_id]
      }
      let tripIds: string[] = []
      for (const routeId of routeIds) {
        const t = await this.wakaRedis.getArrayKey(
          routeId,
          'vehicle-position-route'
        )
        tripIds = [...tripIds, ...t]
      }
      const escapedRouteIds = `'${routeIds.join("', '")}'`

      if (tripIds.length === 0) {
        const fallbackTripsRequest = connection.get().request()
        const fallback = await fallbackTripsRequest.query<{ trip_id: string }>(`
        select trip_id from trips trip where trip.route_id in (${escapedRouteIds})
        `)
        tripIds = [...fallback.recordset.map(line => line.trip_id)]
      }
      tripIds = [...new Set(tripIds)]
      const vehiclePostions = await Promise.all(
        tripIds.map(tripId => this.wakaRedis.getVehiclePosition(tripId))
      )
      const sqlTripIdRequest = connection.get().request()
      const escapedTripIds = `'${tripIds.join("', '")}'`
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
      const result: WakaVehicleInfo[] = vehiclePostions
        .filter(vp => vp)
        .map(vehiclePosition => {
          const latitude = oc(vehiclePosition).position.latitude(0)
          const longitude = oc(vehiclePosition).position.longitude(0)
          const bearing = oc(vehiclePosition).position.bearing()
          const speed = oc(vehiclePosition).position.speed()
          const stop_id = oc(vehiclePosition).stopId()
          const current_stop_sequence = oc(
            vehiclePosition
          ).currentStopSequence()
          const congestion_level = oc(vehiclePosition).congestionLevel()
          const tripId = oc(vehiclePosition).trip.tripId('')
          const directionId = oc(vehiclePosition).trip.directionId()
          const label = oc(vehiclePosition).vehicle.label()
          const air_conditioned = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].airConditioned()
          const performing_prior_trip = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].performingPriorTrip()
          const special_vehicle_attributes = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].specialVehicleAttributes()
          const vehicle_model = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].vehicleModel()
          const wheelchair_accessible = oc(vehiclePosition).vehicle[
            '.transit_realtime.tfnswVehicleDescriptor'
          ].wheelChairAccessible()
          const timestamp = oc(vehiclePosition).timestamp(0)
          const split = tripId ? tripId.split('.') : []
          const [
            run,
            timetableId,
            timetableVersion,
            dopRef,
            type,
            cars,
            instance,
          ] = split.length === 7 ? split : new Array(7)
          const backupDirectionId = tripIdsMap[tripId].direction_id
          const direction: number =
            directionId ||
            (backupDirectionId === 0 || backupDirectionId === 1
              ? backupDirectionId
              : 0)
          const result: WakaVehicleInfo = {
            latitude,
            longitude,
            bearing,
            speed,
            direction,
            stop_id,
            congestion_level,
            current_stop_sequence,
            updated_at: new Date(timestamp * 1000) || this.lastVehicleUpdate,
            trip_id: tripId,
            label,
            extraInfo: {
              air_conditioned,
              performing_prior_trip,
              special_vehicle_attributes,
              vehicle_model,
              wheelchair_accessible,
              cars,
              type,
              run,
            },
          }
          return result
        })
      return result
    } catch (err) {
      logger.error({ err })
      throw Error('problem getting vehicle info')
    }
  }

  getTripsEndpoint = async (
    req: WakaRequest<{ trips: string[]; stop_id: string }, null>,
    res: Response
  ) => {
    const { trips, stop_id } = req.body
    const realtimeInfo = await this.getTripsCached(trips, stop_id)
    return res.send(realtimeInfo)
  }

  getVehicleLocationEndpoint = async (
    req: WakaRequest<{ trips: string[] }, null>,
    res: Response
  ) => {
    const { logger } = this
    const { trips } = req.body
    const vehicleInfo = this.getVehiclePositionsCached(trips)
    return res.send(vehicleInfo)
  }

  getLocationsForLine = async (
    req: WakaRequest<null, { line: string }>,
    res: Response
  ) => {
    const { logger } = this
    const {
      params: { line },
      query: { route_id, agency_id },
    } = req
    try {
      const vehicleInfo = await this.getVehicleInfoCached(
        line,
        route_id,
        agency_id
      )
      return res.send(vehicleInfo)
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
}

export default RealtimeAUSYD
