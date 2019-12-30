import * as Logger from 'bunyan'
import { Response } from 'express'
import * as sql from 'mssql'
import { StopRouteType, WakaRequest } from '../../types'
import BaseStops from '../../types/BaseStops'
import Connection from '../db/connection'

interface SearchProps {
  logger: Logger
  connection: Connection
  prefix: string
  stopsExtras: BaseStops
}

class Search {
  logger: Logger
  connection: Connection
  prefix: string
  regionSpecific: BaseStops
  stopsRouteType: StopRouteType
  constructor(props: SearchProps) {
    const { logger, connection, prefix, stopsExtras } = props
    this.logger = logger
    this.connection = connection
    this.prefix = prefix
    this.regionSpecific = stopsExtras

    this.stopsRouteType = {}
  }

  start = async () => {
    await this.getStopsRouteType()
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
    const { logger, allStops } = this
    try {
      const data = await allStops()
      res.send(data)
      return data
    } catch (err) {
      logger.error({ err })
      res.status(500).send(err)
      return err
    }
  }

  private allStops = async () => {
    const { logger, connection, stopsRouteType, stopsFilter } = this
    try {
      const sqlRequest = connection.get().request()
      const result = await sqlRequest.query<{
        stop_id: string
        stop_name: string
      }>(
        `
        SELECT
          stop_code as stop_id,
          stop_name
        FROM
          stops
        WHERE
          location_type = 0 OR location_type IS NULL
        ORDER BY
          len(stop_code),
          stop_code
      `
      )

      return {
        route_types: stopsRouteType,
        items: stopsFilter(result.recordset, 'delete'),
      }
    } catch (err) {
      logger.error({ err }, 'Could not get all stops from database.')
      throw err
    }
  }

  getStopsRouteType = async () => {
    const { logger, connection } = this
    const sqlRequest = connection.get().request()
    try {
      const result = await sqlRequest.query<{
        stop_id: string
        route_type: string
      }>(
        `
        SELECT DISTINCT stops.stop_code AS stop_id, routes.route_type
        FROM stops
        JOIN stop_times ON stop_times.stop_id = stops.stop_id
        JOIN trips ON trips.trip_id = stop_times.trip_id
        JOIN routes ON routes.route_id = trips.route_id
        WHERE route_type <> 3 and route_type <> 700 and route_type <> 712
        ORDER BY stop_code`
      )

      const routeTypes: { [stop_id: string]: string } = {}

      result.recordset.forEach(stop => {
        routeTypes[stop.stop_id] = stop.route_type
      })
      this.stopsRouteType = routeTypes
    } catch (err) {
      logger.error({ err }, 'Could not all stops route types from database.')
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
   *         "route_type": 2
   *       }
   *     ]
   *
   */
  getStopsLatLon = async (req: WakaRequest<null, null>, res: Response) => {
    // no caching here, maybe we need it?
    const { logger, prefix, regionSpecific, stopsFromDb } = this
    if (
      req.query.lat &&
      (req.query.lng || req.query.lon) &&
      req.query.distance
    ) {
      // limit of the distance value
      if (req.query.distance > 1250) {
        return res.status(400).send({
          error: 'too many stops sorry',
        })
      }
      const lat = parseFloat(req.query.lat)
      const lon = parseFloat(req.query.lng || req.query.lon)
      const dist = req.query.distance

      // the database is the default source
      let sources = [stopsFromDb(lat, lon, dist)]
      const extraSources = regionSpecific?.extraSources
      if (prefix === 'nz-wlg' && extraSources) {
        sources = sources.concat(extraSources(lat, lon, dist))
      } else if (prefix === 'nz-akl' && extraSources) {
        sources = sources.concat(extraSources(lat, lon, dist))
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
    } else {
      const error = {
        message: 'please send all required params (lat, lng, distance)',
      }
      return res.status(400).send(error)
    }
  }

  private stopsFromDb = async (lat: number, lon: number, distance: number) => {
    const { connection, prefix, stopsFilter } = this
    const latDist = distance / 100000
    const lonDist = distance / 65000
    const stopLatGt = lat - latDist
    const stopLatLt = lat + latDist
    const stopLngGt = lon - lonDist
    const stopLngLt = lon + lonDist
    const sqlRequest = connection.get().request()
    sqlRequest.input('stop_lat_gt', sql.Decimal(10, 6), stopLatGt)
    sqlRequest.input('stop_lat_lt', sql.Decimal(10, 6), stopLatLt)
    sqlRequest.input('stop_lon_gt', sql.Decimal(10, 6), stopLngGt)
    sqlRequest.input('stop_lon_lt', sql.Decimal(10, 6), stopLngLt)

    // TODO: Temporary - needs to be more robust
    // Other cities have hubs.
    const locationQuery =
      prefix === 'au-syd'
        ? `
    (
      (location_type is null and parent_station is null) OR
      (location_type = 1 and parent_station is null) OR
      (location_type = 0 and parent_station is null)
    )`
        : '(location_type = 0 OR location_type IS NULL)'
    const result = await sqlRequest.query<{
      stop_id: string
      stop_name: string
      stop_lat: number
      stop_lon: number
      location_type: number
    }>(
      `
      SELECT
        stop_code AS stop_id,
        stop_name,
        stop_lat,
        stop_lon,
        location_type
      FROM stops
      WHERE
        ${locationQuery}
        AND stop_lat > @stop_lat_gt AND stop_lat < @stop_lat_lt
        AND stop_lon > @stop_lon_gt AND stop_lon < @stop_lon_lt`
    )
    const stops = stopsFilter(
      result.recordset.map(item => {
        const newItem = JSON.parse(JSON.stringify(item))
        newItem.stop_region = prefix
        newItem.stop_lng = item.stop_lon // this is a dumb api choice in the past
        newItem.route_type = this.stopsRouteType[item.stop_id]

        // TODO: This is a poor assumption - Bus Hubs are a thing (Auckland)
        if (newItem.location_type === 1) {
          newItem.route_type = 2
        }
        if (typeof newItem.route_type === 'undefined') {
          newItem.route_type = 3
        }
        return newItem
      })
    )
    return stops
  }
}
export default Search
