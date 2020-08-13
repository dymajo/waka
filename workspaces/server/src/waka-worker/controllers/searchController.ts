import * as Logger from 'bunyan'
import { Response } from 'express'
import { WakaRequest } from '../../types'
import BaseStops from '../../types/BaseStops'
import Connection from '../db/connection'
import RedisDataAccess from '../dataAccess/redisDataAccess'
import SearchDataAccess from '../dataAccess/searchDataAccess'
import Lines from '../lines/index'
import WakaRedis from '../../waka-realtime/Redis'

interface SearchProps {
  logger: Logger
  connection: Connection
  prefix: string
  stopsExtras: BaseStops
  lines: Lines
  redis: WakaRedis
}

type RouteTypes = { [stop_id: string]: number }

class Search {
  logger: Logger
  connection: Connection
  prefix: string
  regionSpecific: BaseStops
  stopsRouteType: RouteTypes
  searchDataAccess: SearchDataAccess
  lines: Lines
  redisDataAccess: RedisDataAccess

  constructor(props: SearchProps) {
    const { logger, connection, prefix, stopsExtras, lines, redis } = props
    this.logger = logger
    this.connection = connection
    this.prefix = prefix
    this.regionSpecific = stopsExtras
    this.lines = lines

    this.redisDataAccess = new RedisDataAccess({ logger, prefix, redis })
    this.searchDataAccess = new SearchDataAccess({ logger, connection, prefix })
    this.stopsRouteType = {}
  }

  start = async () => {
    await this.searchDataAccess.start()
    this.stopsRouteType = this.searchDataAccess.routeTypesCache
  }

  stop = () => { }

  stopsFilter = (recordset: { stop_id: string }[], mode?: string) => {
    const { prefix, regionSpecific } = this
    if (prefix === 'nz-wlg') {
      const { filter } = regionSpecific
      if (filter) {
        return filter(recordset, mode)
      }
    }

    return recordset
  }

  /**
   * @api {get} /:region/stations List - All
   * @apiName GetStations
   * @apiGroup Station
   * @apiDescription This returns all the stations in the region. You generally should not need to use this, use search instead.
   *
   * @apiParam {String} region Region of Worker
   *
   * @apiSuccess {Object} route_types Object with all stations that have route types != 3
   * @apiSuccess {Object[]} items  A list of all the stations
   * @apiSuccess {String} items.stop_id  Unique Stop Id for this station
   * @apiSuccess {String} items.stop_name  Station Name
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "route_types": {
   *         "133": 2
   *       },
   *       "items": [
   *         {
   *           "stop_id": "133",
   *           "stop_name": "Britomart Train Station"
   *         }
   *       ]
   *     }
   *
   */
  all = async (req: WakaRequest<null, null>, res: Response) => {
    const { logger, searchDataAccess } = this
    try {
      const data = await searchDataAccess.getAllStops()
      res.send(data)
    } catch (err) {
      logger.error({ err })
      res.status(500).send({ message: 'Could not get all stops from the database.' })
    }
  }

  /**
   * @api {get} /:region/station/search List - by Location
   * @apiName GetStationSearch
   * @apiGroup Station
   * @apiDescription Supply a latitude and a longitude, and you'll get all the stops back in that area.
   *
   * @apiParam {String} region="auto" Region of Worker, can be set to "auto" to automatically determine worker.
   * @apiParam {String} lat Latitude. Example: -41.2790
   * @apiParam {String} lon Longitude. Example: 174.7806
   * @apiParam {number{0-1250}} distance Search Distance. Example: 380
   *
   * @apiSuccess {Object[]} items A list of all the stations. Not actually called items, the root object is an array.
   * @apiSuccess {String} items.stop_id  Unique Stop Id for this station
   * @apiSuccess {String} items.stop_name  Station Name
   * @apiSuccess {Number} items.stop_lat Stop Latitude
   * @apiSuccess {Number} items.stop_lon Stop Longitude
   * @apiSuccess {String} items.stop_region Worker Region that a stop is in
   * @apiSuccess {Number} items.route_type See GTFS Route Types.
   * @apiSuccess {Object[]} items.lines A list of all the lines that stop at this station
   * @apiSuccess {String} items.lines.agency_id Agency of Line
   * @apiSuccess {String} items.lines.route_short_name Route Short Name of Line
   * @apiSuccess {String} items.lines.route_color Color of Line
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     [
   *       {
   *         "stop_id": "WELL",
   *         "stop_name": "Wellington Station",
   *         "stop_lat": -41.278969,
   *         "stop_lon": 174.780562,
   *         "stop_region": "nz-wlg",
   *         "route_type": 2,
   *         "lines": [
   *            { 
   *              agency_id: "RAIL",
   *              route_short_name: "HVL",
   *              route_color: "#e52f2b"
   *            }
   *          ]
   *       }
   *     ]
   *
   */
  getStopsLatLon = async (req: WakaRequest<null, null>, res: Response) => {
    // no caching here, maybe we need it?
    const { logger, prefix, regionSpecific, stopsFilter, searchDataAccess, lines } = this
    const { lat, lon, distance } = req.query

    if (!(lat && lon && distance)) {
      res.status(400).send({
        message: 'please send all required params (lat, lon, distance)',
      })
      return
    }

    // limit of the distance value
    if (distance > 1250) {
      res.status(400).send({
        message: 'please request less than 1250 distance',
      })
      return
    }

    const latFloat = parseFloat(lat)
    const lonFloat = parseFloat(lon)
    if (Number.isNaN(latFloat) || Number.isNaN(lonFloat)) {
      res.status(400).send({
        message: 'please send lat & lon as numbers'
      })
      return
    }

    // the database is the default source
    // gross wrapper because gross reasons
    const dbWrapper = async (latFloat, lonFloat, dist) => {
      const stops = await searchDataAccess.getStops(latFloat, lonFloat, dist)
      const stopsWithTransfers = await Promise.all(stops.items.map(async stop => {
        try {
          const linesObject = await this.redisDataAccess.getLinesForStop(stop.stop_id)
          return {
            ...stop,
            lines: linesObject.map(l => ({
              ...l,
              route_color: this.lines.getColor(l.agency_id, l.route_short_name)
            })),
          }
        } catch (err) {
          logger.warn({ err })
          return stop
        }
      }))
      return stopsFilter(stopsWithTransfers)
    }

    let sources = [dbWrapper(latFloat, lonFloat, distance)]
    const extraSources = regionSpecific?.extraSources
    if (prefix === 'nz-akl' && extraSources) {
      sources = sources.concat(extraSources(latFloat, lonFloat, distance))
    }

    try {
      // merges all the arays of data together
      const data = await Promise.all(sources)
      const response = [].concat(...data)
      return res.send(response)
    } catch (err) {
      logger.error({ err }, 'Could not get stops lat lng.')
      return res.status(500).send(err)
    }
  }
}
export default Search
