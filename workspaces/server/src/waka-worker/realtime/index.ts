import { Response } from 'express'
import { Logger, WakaRequest } from '../../types'
import BaseRealtime from '../../types/BaseRealtime'
import { isKeyof } from '../../utils'
import WakaRedis from '../../waka-realtime/Redis'
import Connection from '../db/connection'
import RealtimeAUSYD from './regions/au-syd'
import GenericRealtime from './regions/generic'
import RealtimeNZAKL from './regions/nz-akl'
import RealtimeNZWLG from './regions/nz-wlg'

const regions = {
  'au-syd': RealtimeAUSYD,
  'nz-akl': RealtimeNZAKL,
  'nz-wlg': RealtimeNZWLG,
  // 'au-cbr': CanberraRealtime,
}

interface RealtimeProps {
  connection: Connection
  logger: Logger
  prefix: string
  api: { [api: string]: string }
}

interface RealtimeProps {
  connection: Connection
  logger: Logger
  prefix: string
  api: { [prefix: string]: string }
  newRealtime: boolean
  wakaRedis: WakaRedis
}

class Realtime {
  connection: Connection
  logger: Logger
  prefix: string
  fn: BaseRealtime
  newRealtime: boolean
  wakaRedis: WakaRedis
  constructor(props: RealtimeProps) {
    const { connection, logger, prefix, api, newRealtime, wakaRedis } = props
    this.connection = connection
    this.logger = logger
    this.prefix = prefix
    this.newRealtime = newRealtime
    this.wakaRedis = wakaRedis
    const apiKey = api[prefix]
    this.fn = isKeyof(regions, prefix)
      ? new regions[prefix]({
        logger,
        connection,
        apiKey,
        newRealtime,
        wakaRedis,
      })
      : new GenericRealtime({
        connection,
        logger,
        newRealtime,
        wakaRedis,
        prefix,
      })
  }

  start = async () => {
    const { fn, logger } = this
    if (fn) {
      await fn.start()
    } else {
      logger.warn('Realtime not implemented!')
    }
  }

  stop = () => {
    const { fn } = this
    if (fn) {
      fn.stop()
    }
  }

  getCachedTrips = (trips: string[], stop_id: string, train: boolean) => {
    const { fn } = this
    if (fn && fn.getTripsCached) {
      return fn.getTripsCached(trips, stop_id, train)
    }
  }

  /**
   * @api {post} /:region/realtime Trip Updates
   * @apiName GetRealtime
   * @apiGroup Realtime
   * @apiDescription The in built API tester doesn't work for this endpoint! Look at the request example and try it out yourself.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} stop_id Stop_id for trips
   * @apiParam {Object} trips Trips with data you want
   * @apiParam {Object} trips.trip Trip Id you want
   * @apiParam {Number} trips.trip.departure_time_seconds Departure Time Seconds retrieved from static api
   * @apiParam {String} trips.trip.route_short_name Route Short Name retrieved from static api
   * @apiParamExample {json} Request-Example:
   * {
   *   "stop_id": 7058,
   *   "trips": {
   *     "14267044381-20171113160906_v60.12": {
   *       "departure_time_seconds": 82320,
   *       "route_short_name": "267"
   *     }
   *   }
   *
   *
   * @apiSuccess {Object} trips Object of Requested Trips, blank if no data
   * @apiSuccess {Number} trips.stop_sequence What stop the vehicle is at
   * @apiSuccess {Number} trips.delay Delay behind timetabled time
   * @apiSuccess {Number} trips.timestamp Timestamp on the server
   * @apiSuccess {String} trips.v_id Vehicle Id
   * @apiSuccess {Bool} trips.double_decker Whether a vehicle is a double decker or not
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * {
   *   "14267065322-20171113160906_v60.12": {
   *     "stop_sequence": 18,
   *     "delay": 243,
   *     "timestamp": 1511432291.971,
   *     "v_id": "2C8D",
   *     "double_decker": false
   *   }
   * }
   */
  stopInfo = (
    req: WakaRequest<
      { trips: string[]; train: boolean; stop_id: string },
      null
    >,
    res: Response
  ) => {
    if (!req.body.trips) {
      return res.status(400).send({
        message: 'please send trips',
      })
    }

    if (this.fn && typeof this.fn.getTripsEndpoint !== 'undefined') {
      return this.fn.getTripsEndpoint(req, res)
    }
    return res.status(400).send({
      message: 'realtime not available',
    })
  }

  /**
   * @api {get} /:region/realtime/:line Vehicle Location v2 - by route_short_name
   * @apiName GetRealtimeLocationV2
   * @apiGroup Realtime
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} line route_short_name of particular line
   *
   * @apiSuccess {Object[]} vehicle All the vehicles for a particular line.
   * @apiSuccess {Number} trips.latitude Latitude of Vehicle
   * @apiSuccess {Number} trips.longitude longitude of Vehicle
   * @apiSuccess {Number} trips.bearing Bearing of Vehicle, in Degrees
   * @apiSuccess {Number} trips.direction Direction of Vehicle, corresponds to GTFS
   * @apiSuccess {Date} trips.updatedAt When the data for this vehicle was last updated by Waka
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * [
   *   {
   *     "bearing": null,
   *     "direction": 0,
   *     "latitude": -36.77570838,
   *     "longitude": 174.74512788,
   *     "updatedAt": "2019-01-13T18:50:40.694Z"
   *   },
   *   {
   *     "bearing": 258,
   *     "direction": 1,
   *     "latitude": -36.72550673,
   *     "longitude": 174.71478548,
   *     "updatedAt": "2019-01-13T18:50:40.694Z"
   *   }
   * ]
   */
  vehicleLocationV2 = (req: WakaRequest<null, null>, res: Response) => {
    if (this.fn) {
      return this.fn.getLocationsForLine(req, res)
    }

    return res.status(400).send({
      message: 'realtime not available',
    })
  }

  healthcheck = async (req: WakaRequest<null, null>, res: Response) => {
    const { wakaRedis } = this
    const lastTripUpdate = await wakaRedis.getKey('default', 'last-trip-update')
    const lastVehiclePositionUpdate = await wakaRedis.getKey(
      'default',
      'last-vehicle-position-update'
    )
    const lastAlertUpdate = await wakaRedis.getKey(
      'default',
      'last-alert-update'
    )

    res.send({
      lastTripUpdate,
      lastVehiclePositionUpdate,
      lastAlertUpdate,
    })
  }

  serviceAlerts = (
    req: WakaRequest<
      { routeId?: string; stopId?: string; tripId?: string },
      null
    >,
    res: Response
  ) => {
    if (this.fn) {
      if (this.fn.getServiceAlertsEndpoint)
        return this.fn.getServiceAlertsEndpoint(req, res)
    }
  }

  // all = (req, res) => {
  //   if (this.fn) {
  //     return this.fn.getAllVehicleLocations(req, res)
  //   }
  //   return res.status(400).send({
  //     message: 'realtime not available',
  //   })
  // }
}
export default Realtime
