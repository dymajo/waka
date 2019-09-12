import { Response } from 'express'
import { VarChar } from 'mssql'
import { oc } from 'ts-optchain'
import moment from 'moment-timezone'
import Connection from '../../db/connection'
import {
  WakaRequest,
  Logger,
  WakaTripUpdate,
  WakaVehicleInfo,
  DBStopTime,
} from '../../../typings'

import BaseRealtime from '../../../types/BaseRealtime'
import StopsDataAccess from '../../stops/dataAccess'
import WakaRedis from '../../../waka-realtime/Redis'
import { prefixToTimezone } from '../../../utils';

interface GenericRealtimeProps {
  connection: Connection
  logger: Logger
  newRealtime: boolean
  wakaRedis: WakaRedis
  prefix: string
}

class GenericRealtime extends BaseRealtime {
  wakaRedis: WakaRedis
  newRealtime: boolean
  prefix: string
  dataAccess: StopsDataAccess

  constructor(props: GenericRealtimeProps) {
    super()
    const { connection, logger, newRealtime, wakaRedis, prefix } = props
    this.newRealtime = newRealtime
    this.connection = connection
    this.logger = logger
    this.wakaRedis = wakaRedis
    this.prefix = prefix
    this.dataAccess = new StopsDataAccess({ connection, prefix })
  }

  start = async () => {
    const { logger, newRealtime } = this

    if (!newRealtime) {
      logger.error('Must be new realtime')
    } else {
      logger.info('Realtime Gateway started')
    }
  }

  stop = () => {
    this.logger.warn('Realtime stopped.')
  }

  getTripsCached = async (trips: string[], stop_id: string) => {
    const { connection, dataAccess, logger } = this
    const realtimeInfo: { [tripId: string]: WakaTripUpdate } = {}

    // now is 00:00 in region's local timezone
    const timezone = prefixToTimezone(this.prefix)
    const now = moment().tz(timezone)
    now.seconds(0)
    now.hours(0)
    now.minutes(0)

    const realtimeTripData = []
    for (const tripId of trips) {
      try {
        const data = await this.wakaRedis.getTripUpdate(tripId)
        if (data !== undefined && data !== null) {
          realtimeTripData.push(data)
        }
      } catch (error) {
        logger.warn(error)
      }
    }

    const dbQuery = realtimeTripData.map(trip => {
      const stopTimeUpdates = trip.stopTimeUpdate.map(stopTimeUpdate => {
        const requiredData = { tripId: trip.trip.tripId, stopSequence: null, stopId: null }
        // grab the stop time update if there's no stop id or stop sequence
        if (stopTimeUpdate.stopId === undefined) {
          requiredData.stopSequence = stopTimeUpdate.stopSequence
        } else if (stopTimeUpdate.stopSequence === undefined) {
          requiredData.stopId = stopTimeUpdate.stopId
        } else {
          // likewise, if there's no delay or time, grab it from the db so we can interpolate
          if (stopTimeUpdate.departure) {
            const { delay, time } = stopTimeUpdate.departure
            if (delay === undefined || time === undefined) { 
              requiredData.stopId = stopTimeUpdate.stopId
            }
          }
          if (stopTimeUpdate.arrival) {
            const { delay, time } = stopTimeUpdate.arrival
            if (delay === undefined || time === undefined) { 
              requiredData.stopId = stopTimeUpdate.stopId
            }
          }
        }
        return requiredData
      })
      const stopSequences =  stopTimeUpdates.map(t => t.stopSequence).filter(t => t !== null)
      const stopIds =  stopTimeUpdates.map(t => t.stopSequence).filter(t => t !== null)

      // TODO: this is hot garbage
      let query
      if (stopSequences.length > 0) {
        query = `(trip_id = '${trip.trip.tripId}' AND stop_sequence in (${stopSequences.join(',')}))`
      } else if (stopIds.length > 0) {
        query = `(trip_id = '${trip.trip.tripId}' AND stop_sequence in ('${stopIds.join('\' , \'')}'))`
      }
      return query
    })

    let results = []
    if (dbQuery.length > 0) {
      const sqlRequest = connection.get().request()
      const result = await sqlRequest.query<{
        trip_id: string,
        arrival_time: string,
        departure_time: string,
        stop_id: string,
        stop_sequence: number
      }>(
        `SELECT trip_id, arrival_time, departure_time, stop_id, stop_sequence FROM stop_times WHERE ${dbQuery.join(' OR ')}`
      )
      results = result.recordset
    }

    realtimeTripData.forEach(realtimeTrip => {
      if (realtimeTrip.stopTimeUpdate === undefined || realtimeTrip.stopTimeUpdate.length === 0) return

      // enrich the data
      const { trip, stopTimeUpdate } = realtimeTrip
      const { tripId } = trip
      trip.scheduleRelationship = trip.scheduleRelationship || 'SCHEDULED'
      
      stopTimeUpdate.forEach(update => {
        update.scheduleRelationship = update.scheduleRelationship || 'SCHEDULED'

        let timetabledTrip = null
        if (update.stopId === undefined) {
          timetabledTrip = results.find(t => t.trip_id === trip.tripId && t.stop_sequence === update.stopSequence)
        } else {
          timetabledTrip = results.find(t => t.trip_id === trip.tripId && t.stop_id === update.stopId)
        }

        update.stopId = update.stopId || timetabledTrip.stop_id
        update.stopSequence = update.stopSequence || timetabledTrip.stop_sequence

        if (update.departure) {
          let { delay, time } = update.departure
          const scheduledDeparture = now.unix() + moment(timetabledTrip.departure_time, 'HH:mm:ss').unix()
          if (delay === undefined) {
            update.departure.delay = scheduledDeparture - time
          } else if (time === undefined) {
            update.departure.time = scheduledDeparture + delay
          }
        }

        if (update.arrival) {
          let { delay, time } = update.arrival
          const scheduledArrival = now.unix() + moment(timetabledTrip.arrival_time, 'HH:mm:ss').unix()
          if (delay === undefined) {
            update.arrival.delay = scheduledArrival - time
          } else if (time === undefined) {
            update.arrival.time = scheduledArrival + delay
          }
        }
      })

      const targetStop = stopTimeUpdate.find(s => s.stopId === stop_id) || stopTimeUpdate[0]
      const delay = oc(targetStop).departure.delay(oc(targetStop).arrival.delay())

      realtimeInfo[tripId] = {
        ...realtimeTripData,
        trip,
        stopTimeUpdate,
        // these bottom two are legacy
        delay,
        stop_sequence: oc(targetStop).stopSequence(),
      }
    })    
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
          const performing_prior_trip =
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptor'
            ].performingPriorTrip() ||
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptorMnwNlr'
            ].performingPriorTrip()
          const special_vehicle_attributes =
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptor'
            ].specialVehicleAttributes() ||
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptorMnwNlr'
            ].specialVehicleAttributes()
          const vehicle_model =
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptor'
            ].vehicleModel() ||
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptorMnwNlr'
            ].vehicleModel()
          const wheelchair_accessible =
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptor'
            ].wheelChairAccessible() ||
            oc(vehiclePosition).vehicle[
              '.transit_realtime.tfnswVehicleDescriptorMnwNlr'
            ].wheelChairAccessible()
          const timestamp = oc(vehiclePosition).timestamp(0)
          const split = tripId ? tripId.split('.') : []
          const consist = oc(vehiclePosition)['.transit_realtime.consist']([])
          let [
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
          if (type) {
            switch (type) {
              case 'A':
                type = 'Waratah'
                break
              case 'B':
                type = 'Waratah Series 2'
                break
              case 'C':
                type = 'C Set'
                break
              case 'H':
                type = 'OSCAR'
                break
              case 'J':
                type = 'Hunter'
                break
              case 'K':
                type = 'K Set'
                break
              case 'M':
                type = 'Millennium'
                break
              case 'N':
                type = 'Endeavour'
                break
              case 'P':
                type = 'XPLORER'
                break
              case 'S':
                type = 'S Set'
                break
              case 'T':
                type = 'Tangara'
                break
              case 'V':
                type = 'Intercity'
                break
              case 'X':
                type = 'XPT'
                break

              default:
                break
            }
          }
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
              consist,
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

export default GenericRealtime
