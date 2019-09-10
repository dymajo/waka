import moment from 'moment-timezone'
import { Response } from 'express'
import * as Logger from 'bunyan'
import { oc } from 'ts-optchain'
import StopsDataAccess from './dataAccess'
import Connection from '../db/connection'
import { WakaRequest, DBStopTime, WakaTripUpdate } from '../../typings'
import Lines from '../lines'
import BaseStops from '../../types/BaseStops'
import WakaRedis from '../../waka-realtime/Redis'
import { prefixToTimezone } from '../../utils'

interface StationProps {
  logger: Logger
  connection: Connection
  prefix: string
  stopsExtras?: BaseStops
  lines: Lines
  redis: WakaRedis
  version: string
  realtimeTimes(
    trips: string[],
    stop_id: string,
    train: boolean
  ):
    | Promise<{
        [tripId: string]: WakaTripUpdate
      }>
    | undefined
}

class Station {
  logger: Logger
  connection: Connection
  prefix: string
  regionSpecific?: BaseStops
  lines: Lines
  redis: WakaRedis
  realtimeTimes: (
    trips: string[],
    stop_id: string,
    train: boolean
  ) =>
    | Promise<{
        [tripId: string]: WakaTripUpdate
      }>
    | undefined
  dataAccess: StopsDataAccess
  version: string
  constructor(props: StationProps) {
    const {
      logger,
      connection,
      prefix,
      version,
      stopsExtras,
      lines,
      realtimeTimes,
      redis,
    } = props
    this.redis = redis
    this.logger = logger
    this.connection = connection
    this.prefix = prefix
    this.version = version
    this.regionSpecific = stopsExtras
    this.lines = lines
    this.realtimeTimes = realtimeTimes

    this.dataAccess = new StopsDataAccess({ connection, prefix })
  }

  transfers = async () => {
    const transfers = await this.dataAccess.getTransfers()
    for (const stopId in transfers) {
      if (Object.prototype.hasOwnProperty.call(transfers, stopId)) {
        try {
          const stopTransfers = transfers[stopId].toString()
          this.redis.client.set(
            `waka-worker:${this.prefix}:stop-transfers:${stopId}`,
            stopTransfers
          )
        } catch (error) {
          console.log(error)
        }
      }
    }
    const { logger, prefix, version } = this
    logger.info({ stopCount: Object.keys(transfers).length }, 'Got Transfers')
  }

  getBounds = async () => {
    const { dataAccess } = this
    const bounds = await dataAccess.getBounds()
    return {
      lat: { min: bounds.lat_min, max: bounds.lat_max },
      lon: { min: bounds.lon_min, max: bounds.lon_max },
    }
  }

  /**
   * @api {get} /:region/station/:stop_id Info - by stop_id
   * @apiName GetStation
   * @apiGroup Station
   * @apiDescription This returns data on a single station.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} stop_id Station Stop ID, find using All Stations or Stations by Location routes.
   *
   * @apiSuccess {String} stop_id  Unique Stop Id for this station
   * @apiSuccess {String} stop_name  Station Name
   * @apiSuccess {String} stop_desc Station Description, if any
   * @apiSuccess {String} stop_lat Station Latitude
   * @apiSuccess {String} stop_lon Station Longitude
   * @apiSuccess {String} zone_id Fare zone - See GTFS.
   * @apiSuccess {String} location_type If the station is a parent station or not - see GTFS.
   * @apiSuccess {String} parent_station Parent Station, if any
   * @apiSuccess {String} stop_timezone Timezone of station, usually null & assumed to be agency timezone.
   * @apiSuccess {String} wheelchair_boarding Wheelchair Boarding - see GTFS.
   * @apiSuccess {String} route_type GTFS Route Type from this Station
   * @apiSuccess {String} prefix Worker Region of station
   *
   * @apiSuccessExample Success-Response:
   *    HTTP/1.1 200 OK
   *    {
   *      "stop_id": "133",
   *      "stop_name": "Britomart Train Station",
   *      "stop_desc": null,
   *      "stop_lat": -36.84429,
   *      "stop_lon": 174.76848,
   *      "zone_id": "merged_20",
   *      "location_type": 0,
   *      "parent_station": null,
   *      "stop_timezone": null,
   *      "wheelchair_boarding": null,
   *      "route_type": 2,
   *      "prefix": "nz-akl"
   *    }
   *
   */
  stopInfo = async (
    req: WakaRequest<null, { station: string }>,
    res: Response
  ) => {
    const { prefix, dataAccess, regionSpecific } = this
    if (!req.params.station) {
      return res.status(404).send({
        message: 'Please specify a station.',
      })
    }

    let stopCode = req.params.station.trim()
    let override = ''
    if (
      prefix === 'nz-wlg' &&
      oc(regionSpecific)
        .badStops([])
        .indexOf(stopCode) > -1
    ) {
      override = stopCode
      stopCode = `${stopCode}1`
    }

    const notFound = { message: 'Station not found.' }
    try {
      const data = await dataAccess.getStopInfo(stopCode)
      if (override) {
        data.stop_id = override
      }
      if (data.location_type === 1) {
        const platforms = await dataAccess.getPlatforms(data.stop_id)
        return res.send({ ...data, platforms })
      }
      return res.send(data)
    } catch (err) {
      // TODO: make this more generic
      if (prefix === 'nz-akl') {
        try {
          const getSingle = oc(regionSpecific).getSingle()
          if (getSingle) {
            const data = await getSingle(stopCode)
            return res.send(data)
          }
        } catch (err) {
          // couldn't get any carpark
        }
      }
      return res.status(404).send(notFound)
    }
  }

  /**
   * @api {get} /:region/station/:stop_id/times/:time Stop Times - by stop_id
   * @apiName GetTimes
   * @apiGroup Station
   * @apiDescription Shows services at a particular station.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} stop_id Station Stop ID, find using All Stations or Stations by Location routes.
   * @apiParam {String} [time] Find services at a particular time, defaults to current time.
   *
   * @apiSuccess {String} provider The data source. Usually "sql-server"
   * @apiSuccess {Number} current_time  Server time, in seconds.
   * @apiSuccess {Object[]} trips List of all the trips for the station.
   * @apiSuccess {String} trips.trip_id GTFS trip_id
   * @apiSuccess {Number} trips.stop_sequence What stop of the line this station corresponds to.
   * @apiSuccess {String} trips.trip_headsign General direction of where the service is going - usually displayed on vehicle
   * @apiSuccess {String} trips.shape_id Shape_id of route
   * @apiSuccess {Number} trips.direction_id 0 for outbound, 1 for inbound.
   * @apiSuccess {Date} trips.start_date When this trip is valid from - server filters out invalid ones automatically
   * @apiSuccess {Date} trips.end_date When this trip is valid unti - server filters out invalid ones automatically
   * @apiSuccess {String} trips.route_short_name Short service name.
   * @apiSuccess {String} trips.route_long_name Long service name - usually origin & destination. Sometimes "Eastern Line"
   * @apiSuccess {Number} trips.route_type GTFS Route Transport Type
   * @apiSuccess {String} trips.agency_id Agency that operates this service
   * @apiSuccess {String} trips.route_color Colour for the route
   * @apiSuccess {String} trips.route_icon Icon for the route (optional)
   * @apiSuccess {Number} trips.departure_time_seconds When the service is due to depart from this station, in seconds.
   * @apiSuccess {Number} trips.arrival_time_seconds When the service is due to arrive at this station, in seconds.
   * @apiSuccess {Date} trips.departure_time UTC date when the service is due to depart from this station.
   * @apiSuccess {Date} trips.arrival_time UTC date when the service is due to arrive at this station.
   * @apiSuccess {Number} trips.dwell Time between arrival and departure, in seconds.
   * @apiSuccess {Number} trips.drop_off_type Indicates whether riders are dropped off at a stop as part of the normal schedule or whether a dropoff at the stop is unavailable.
   * @apiSuccess {Number} trips.pickup_type Indicates whether riders are picked up at a stop as part of the normal schedule or whether a pickup at the stop isn't available.
   * @apiSuccess {Object[]} realtime Realtime Info, only provided for some services. If empty, call the realtime API.
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "provider": "sql-server",
   *       "currentTime": 45960,
   *       "trips": [
   *         {
   *           "trip_id": "50051071268-20171113160906_v60.12",
   *           "stop_sequence": 11,
   *           "trip_headsign": "Britomart",
   *           "shape_id": "1198-20171113160906_v60.12",
   *           "direction_id": 0,
   *           "start_date": "2017-11-16T00:00:00.000Z",
   *           "end_date": "2017-12-09T00:00:00.000Z",
   *           "route_short_name": "EAST",
   *           "route_long_name": "Manukau Train Station to Britomart Train Station",
   *           "route_type": 2,
   *           "agency_id": "AM",
   *           "route_color": "#f39c12",
   *           "route_icon": "nz/at-metro-eastern",
   *           "departure_time_seconds": 44280
   *         },
   *       ],
   *       "realtime": {
   *         "50051071268-20171113160906_v60.12": {
   *           "stop_sequence": 41,
   *           "delay": -35,
   *           "timestamp": 1511222480.044,
   *           "v_id": "2CA9",
   *           "double_decker": false
   *         }
   *       }
   *     }
   */
  stopTimes = async (
    req: WakaRequest<{}, { time: string; station: string }>,
    res: Response
  ) => {
    const {
      prefix,
      dataAccess,
      logger,
      lines,
      regionSpecific,
      realtimeTimes,
    } = this

    if (!req.params.station) {
      return res.status(404).send({
        message: 'Please specify a stop.',
      })
    }

    const station = req.params.station.trim()

    // carparks
    if (prefix === 'nz-akl') {
      const getTimes = oc(regionSpecific).getTimes()
      if (getTimes) {
        const data = getTimes(station)
        if (data !== null) {
          return res.send(data)
        }
      }
    }

    const timezone = prefixToTimezone(prefix)

    const time = moment().tz(timezone)
    let currentTime = new Date(Date.UTC(1970, 0, 1, time.hour(), time.minute()))
    let midnightOverride = false
    if (req.params.time) {
      const split = req.params.time.split(':')
      const tentativeDate = new Date(
        Date.UTC(
          1970,
          0,
          1,
          Number.parseInt(split[0], 10),
          Number.parseInt(split[1], 10)
        )
      )
      if (tentativeDate.toString() !== 'Invalid Date') {
        currentTime = tentativeDate
        midnightOverride = true
      }
    }
    const sendingCurrentTime = currentTime.getTime() / 1000

    const today = new Date(0)
    today.setUTCFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date())

    // midnight fix
    if (time.hour() < 5 && midnightOverride === false) {
      today.setTime(today.getTime() - 1000 * 60 * 60 * 24)
    }

    let procedure = 'GetStopTimes'
    if (station.split(',').length > 1) {
      // this *does not* work for parent stations
      procedure = 'GetMultiStopTimes'
    }
    let trips: DBStopTime[] = []
    const realtimeTrips: string[] = []
    try {
      trips = await dataAccess.getStopTimes(
        station,
        currentTime,
        today,
        procedure
      )
    } catch (err) {
      logger.error({ err }, 'Could not get stop times.')
      return res.status(500).send(err)
    }

    // now is 00:00 in region's local timezone
    const now = moment().tz(timezone)
    now.seconds(0)
    now.hours(0)
    now.minutes(0)

    const sendingTrips = trips.map(r => {
      // fully formed arrival and departure times in region's local tz
      const arrivalTime = moment.unix(now.unix() + r.new_arrival_time)
      const departureTime = moment.unix(now.unix() + r.new_departure_time)

      // time between arrival and departure
      const dwell = r.new_departure_time - r.new_arrival_time
      let departure_time_seconds = new Date(r.departure_time).getTime() / 1000
      if (r.departure_time_24) {
        departure_time_seconds += 86400
      }
      let arrival_time_seconds = new Date(r.arrival_time).getTime() / 1000
      if (r.arrival_time_24) {
        arrival_time_seconds += 86400
      }

      const route_icon = lines.getIcon(r.agency_id, r.route_short_name)

      // 30mins of realtime
      if (
        departure_time_seconds < sendingCurrentTime + 1800 ||
        r.departure_time_24
      ) {
        realtimeTrips.push(r.trip_id)
      }
      let platform: string
      let { stop_name } = r
      if (r.parent_station) {
        const split = r.stop_name.split(' Platform ')
        if (split.length === 2) {
          ;[stop_name, platform] = split
        }
      }
      const record = {
        arrival_time_seconds,
        departure_time_seconds,
        arrival_time: arrivalTime,
        departure_time: departureTime,
        route_icon,
        dwell,
        trip_headsign: r.trip_headsign || r.route_long_name,
        route_id: r.route_id,
        route_short_name: r.route_short_name,
        route_long_name: r.route_long_name,
        agency_id: r.agency_id,
        stop_sequence: r.stop_sequence,
        direction_id: r.direction_id,
        route_color: `#${r.route_color}`,
        route_text_color: `#${r.route_text_color}`,
        trip_id: r.trip_id,
        pickup_type: r.pickup_type,
        drop_off_type: r.drop_off_type,
        shape_id: r.shape_id,
        platform,
        stop_name,
        stop_id: r.stop_id,
      }
      return record
    })
    const realtime = await realtimeTimes(realtimeTrips, station, false)

    const sending: {
      provider: string
      currentTime: number
      trips: {
        drop_off_type: 0 | 1
        pickup_type: 0 | 1
        stop_sequence: number
        trip_id: string
        direction_id: number
        shape_id: string
        trip_headsign: string
        route_color: string
        route_long_name: string
        route_short_name: string
        agency_id: string
        stop_name?: string
        platform?: string
      }[]
      realtime?: { [tripId: string]: WakaTripUpdate }
      allRoutes?: any
    } = {
      provider: 'sql-server',
      currentTime: sendingCurrentTime,
      trips: sendingTrips,
      realtime,
    }
    // the all routes stuff is possibly an extra call to the database,
    // so we only do it if we need to
    if (req.query.allRoutes || sending.trips.length === 0) {
      try {
        sending.allRoutes = await dataAccess.getRoutesForStop(station)
      } catch (err) {
        logger.error({ err, station }, 'Could not get all routes for station.')
      }
    }
    return res.send(sending)
  }

  /**
   * @api {get} /:region/station/:stop_id/timetable/:route/:direction/:offset Timetable - by stop_id
   * @apiName GetTimetable
   * @apiGroup Station
   * @apiDescription Shows timetable for a particular service at a particular station.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} stop_id Station Stop ID, find using All Stations or Stations by Location routes.
   * @apiParam {String} route route_short_name to look up.
   * @apiParam {Number} direction 0 for inbound, 1 for outbound, 2 for both directions.
   * @apiParam {Number} [offset] The number of days from today to get the timetable for
   *
   * @apiSuccess {Object[]} trips List of all the trips for the station - just in root array, no actual object
   * @apiSuccess {String} trips.trip_id GTFS trip_id
   * @apiSuccess {String} trips.service_id GTFS service_id
   * @apiSuccess {String} trips.shape_id GTFS shape_id
   * @apiSuccess {String} trips.trip_headsign General direction of where the service is going - usually displayed on vehicle
   * @apiSuccess {Number} trips.direction_id 0 for outbound, 1 for inbound.
   * @apiSuccess {Number} trips.stop_sequence What stop of the line this station corresponds to.
   * @apiSuccess {String} trips.route_id GTFS route_id
   * @apiSuccess {String} trips.route_long_name Long service name - usually origin & destination. Sometimes "Eastern Line"
   * @apiSuccess {String} trips.agency_id Agency that operates this service
   * @apiSuccess {Number} trips.departure_time_seconds When the service is due to depart from this station, in seconds.
   * @apiSuccess {Number} trips.arrival_time_seconds When the service is due to arrive at this station, in seconds.
   * @apiSuccess {Date} trips.departure_time UTC time of when the service is due to depart from this station.
   * @apiSuccess {Date} trips.arrival_time UTC time of when the service is due to arrive at this station.
   * @apiSuccess {String} trips.route_color Colour for the route
   * @apiSuccess {String} trips.route_icon Icon for the route (optional)
   * @apiSuccess {Number} trips.currentTime Server Time, in Seconds
   * @apiSuccess {Date} trips.date Date of the Trip, in local time
   *
   * @apiSuccessExample Success-Response:
   *    HTTP/1.1 200 OK
   *    [
   *      {
   *        "trip_id": "50051071494-20171113160906_v60.12",
   *        "service_id": "50051071494-20171113160906_v60.12",
   *        "shape_id": "1198-20171113160906_v60.12",
   *        "trip_headsign": "Britomart",
   *        "direction_id": 0,
   *        "stop_sequence": 11,
   *        "route_id": "50151-20171113160906_v60.12",
   *        "route_long_name": "Manukau Train Station to Britomart Train Station",
   *        "agency_id": "AM",
   *        "departure_time_seconds": 20880,
   *        "route_color": "#f39c12",
   *        "route_icon": "nz/at-metro-eastern",
   *        "currentTime": 47760,
   *        "date": "2017-12-08T00:00:00.000Z"
   *      }
   *    ]
   */
  timetable = async (
    req: WakaRequest<
      null,
      { station: string; route: string; direction: string; offset: string }
    >,
    res: Response
  ) => {
    const { prefix, dataAccess, logger, regionSpecific, lines } = this
    const { station, route, direction, offset } = req.params

    if (parseInt(direction, 10) > 2 || parseInt(direction, 10) < 0) {
      return res.status(400).send({ error: 'Direction is not valid.' })
    }
    let dateOffset = 0
    if (!Number.isNaN(parseInt(offset, 10))) {
      dateOffset = parseInt(offset, 10)
    }

    const timezone = prefixToTimezone(prefix)
    const time = moment().tz(timezone)
    const currentTime = new Date(
      Date.UTC(1970, 0, 1, time.hour(), time.minute())
    )

    const today = new Date(Date.UTC(1970, 0, 1, 0, 0))
    today.setUTCFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date() + dateOffset)

    // now is 00:00 in region's local timezone
    const now = moment(today).tz(timezone)
    now.seconds(0)
    now.hours(0)
    now.minutes(0)

    // combines train stations platforms together
    const procedure = 'GetTimetable'
    let trips = []
    try {
      trips = await dataAccess.getTimetable(
        station,
        route,
        today,
        direction,
        procedure
      )
    } catch (err) {
      logger.error({ err }, 'Could not get timetable.')
      return res.status(500).send(err)
    }

    const sending = trips.map(oldRecord => {
      const record = JSON.parse(JSON.stringify(oldRecord))

      // fully formed arrival and departure times in region's local tz
      record.departure_time = moment.unix(
        now.unix() + record.new_departure_time
      )
      record.arrival_time = moment.unix(now.unix() + record.new_arrival_time)

      // old for compat
      record.departure_time_seconds = record.new_departure_time
      record.arrival_time_seconds = record.new_arrival_time

      record.route_color = lines.getColor(record.agency_id, req.params.route)
      record.route_icon = lines.getIcon(record.agency_id, req.params.route)
      record.currentTime = currentTime.getTime() / 1000
      record.date = today

      if (record.trip_headsign === null) {
        logger.warn('This dataset has a null trip_headsign.')
        record.trip_headsign = record.route_long_name
      }
      delete record.departure_time_24
      delete record.new_departure_time
      delete record.new_arrival_time
      return record
    })
    return res.send(sending)
  }
}
export default Station
