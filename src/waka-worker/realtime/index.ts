import * as Logger from 'bunyan'
import { Response } from 'express'
import RealtimeAUSYD from './regions/au-syd'
import RealtimeNZAKL from './regions/nz-akl'
import RealtimeNZWLG from './regions/nz-wlg'
import Connection from '../db/connection'
import { BaseRealtime, WakaRequest } from '../../typings'
import CanberraRealtime from './regions/au-cbr'
import { isKeyof } from '../../utils'

const regions = {
  'au-syd': RealtimeAUSYD,
  // 'nz-akl': RealtimeNZAKL,
  // 'nz-wlg': RealtimeNZWLG,
  // 'au-cbr': CanberraRealtime,
}

interface RealtimeProps {
  connection: Connection
  logger: Logger
  prefix: string
  api: { [api: string]: string }
}

class Realtime {
  connection: Connection
  logger: Logger
  prefix: string
  fn: BaseRealtime
  constructor(props: RealtimeProps) {
    const { connection, logger, prefix, api } = props
    this.connection = connection
    this.logger = logger
    this.prefix = prefix

    const apiKey = api[prefix]
    this.fn =
      regions[prefix] !== undefined
        ? new regions[prefix]({ logger, connection, apiKey })
        : null
  }

  start = () => {
    const { fn, logger } = this
    if (fn) {
      fn.start()
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

  getCachedTrips = (trips: string[]) => {
    const { fn } = this
    if (fn && fn.getTripsCached) {
      return fn.getTripsCached(trips)
    }
    return {}
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
   * @api {post} /:region/vehicle_location Vehicle Location v1
   * @apiName GetRealtimeLocation
   * @apiDeprecated please use (#Realtime:GetRealtimeLocationV2).
   * @apiGroup Realtime
   * @apiDescription The in built API tester doesn't work for this endpoint! Look at the request example and try it out yourself.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {Object[String]} trips Array of trips that you want
   * @apiParamExample {json} Request-Example:
   * {
   *   "trips": [
   *     "14267044381-20171113160906_v60.12"
   *   ]
   * }
   *
   * @apiSuccess {Object} trips Object of Requested Trips, blank if no data
   * @apiSuccess {Number} trips.latitude Latitude of Vehicle
   * @apiSuccess {Number} trips.longitude longitude of Vehicle
   * @apiSuccess {Number} trips.bearing Bearing of Vehicle, in Degrees
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * {
   *   "14267065322-20171113160906_v60.12": {
   *     "latitude":  -36.851867,
   *     "longitude": 174.76415,
   *     "bearing": 197
   *   }
   * }
   */
  vehicleLocation = (req: WakaRequest<null, null>, res: Response) => {
    if (this.fn) {
      return this.fn.getVehicleLocationEndpoint(req, res)
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

  healthcheck = (req: WakaRequest<null, null>, res: Response) => {
    if (this.fn) {
      let { lastTripUpdate } = this.fn
      if (lastTripUpdate === undefined) lastTripUpdate = null
      return res.send({ lastTripUpdate })
    }
    return res.status(400).send({
      message: 'realtime not available',
    })
  }

  all = (req: WakaRequest<null, null>, res: Response) => {
    if (this.fn) {
      return this.fn.getAllVehicleLocations(req, res)
    }
    return res.status(400).send({
      message: 'realtime not available',
    })
  }
}
export default Realtime
