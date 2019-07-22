import * as sql from 'mssql'
import { Request, Response } from 'express'
import cityMetadataJSON from '../../cityMetadata.json'
import StopsDataAccess from '../stops/dataAccess'
import Storage from '../db/storage'

import SydneyLines from './regions/au-syd'
import AucklandLines from './regions/nz-akl'
import ChristchurchLines from './regions/nz-chc'
import WellingtonLines from './regions/nz-wlg'
import GenericLines from './regions/generic'
import Connection from '../db/connection'
import Search from '../stops/search'
import { Logger, WakaRequest } from '../../typings'
import { isKeyof, sortFn } from '../../utils'
import BaseLines from '../../types/BaseLines'
import WakaRedis from '../../waka-realtime/Redis'

const regions = {
  'au-syd': SydneyLines,
  'nz-akl': AucklandLines,
  'nz-chc': ChristchurchLines,
  'nz-wlg': WellingtonLines,
}
interface LinesProps {
  logger: Logger
  connection: Connection
  prefix: string
  version: string
  search: Search
  config: {
    storageService: 'aws' | 'local'
    shapesContainer: string
    shapesRegion: string
  }
  redis: WakaRedis
}

class Lines {
  logger: Logger
  connection: Connection
  prefix: string
  version: string
  search: Search
  stopsDataAccess: StopsDataAccess
  storageSvc: Storage
  lineDataSource: BaseLines
  config: {
    storageService: 'aws' | 'local'
    shapesContainer: string
    shapesRegion: string
  }
  cityMetadata: {
    [prefix: string]: {
      name: string
      secondaryName: string
      longName: string
      initialLocation: number[]
      showInCityList: boolean
      bounds?: {
        lat: {
          min: number
          max: number
        }
        lon: {
          min: number
          max: number
        }
      }
    }
  }
  redis: WakaRedis
  constructor(props: LinesProps) {
    const { logger, connection, prefix, version, config, search, redis } = props
    this.logger = logger
    this.connection = connection
    this.prefix = prefix
    this.version = version
    this.search = search
    this.config = config
    this.cityMetadata = cityMetadataJSON
    this.redis = redis
    // not too happy about this
    this.stopsDataAccess = new StopsDataAccess({ connection, prefix })

    this.storageSvc = new Storage({
      backing: config.storageService,
      region: config.shapesRegion,
      logger,
    })

    this.lineDataSource = isKeyof(regions, prefix)
      ? new regions[prefix]({ logger, connection })
      : new GenericLines({ logger, connection })
  }

  start = async () => {
    const { logger, lineDataSource } = this
    try {
      if (lineDataSource === null) {
        throw new Error('Region not implemented.')
      }
      await lineDataSource.start()

      // the second element in the array is default, if it is not exported from the source
      const requiredProps: [string, {} | []][] = [
        ['lineColors', {}],
        ['lineIcons', {}],
        ['friendlyNames', {}],
        ['friendlyNumbers', {}],
        ['lineGroups', []],
        ['allLines', {}],
        ['lineOperators', {}],
      ]
    } catch (err) {
      logger.error({ err }, 'Could not load line data.')
    }
  }

  stop = () => { }

  getColor = (agencyId: string, routeShortName: string) => {
    // If you need to get colors from the DB, please see the Wellington Lines Code.
    // Essentially does a one-time cache of all the colors into the lineData object.
    const { lineDataSource } = this
    if (lineDataSource.getColor) {
      return lineDataSource.getColor(agencyId, routeShortName)
    }
    if (lineDataSource.lineColors) {
      return lineDataSource.lineColors[routeShortName] || '#00263A'
    }
    return '#00263A'
  }

  getIcon = (agencyId: string, routeShortName: string) => {
    // this will probably be revised soon
    const { lineDataSource } = this
    if (lineDataSource.lineIcons) {
      return lineDataSource.lineIcons[routeShortName] || null
    }
    return null
  }

  /**
   * @api {get} /:region/lines List - All
   * @apiName GetLines
   * @apiGroup Lines
   *
   * @apiParam {String} region Region of Worker
   *
   * @apiSuccess {Object} meta Region metadata
   * @apiSuccess {String} meta.prefix Region Prefix
   * @apiSuccess {String} meta.name Name of the Region
   * @apiSuccess {String} meta.secondaryName Extra Region Name (State, Country etc)
   * @apiSuccess {String} meta.longName The name and secondary name combined.
   * @apiSuccess {Object[]} friendlyNames Key value store of Route Short Names to more official names
   * @apiSuccess {Object[]} colors Key value store of Route Short Names to corresponding colors
   * @apiSuccess {Object[]} icons Key value store of Route Short Names to corresponding icons (optional)
   * @apiSuccess {Object[]} groups Grouping for all the lines into region.
   * @apiSuccess {String} groups.name Name of Group
   * @apiSuccess {String[]} groups.items Route Short Names that belong in the group
   * @apiSuccess {Object[]} lines List of all lines
   * @apiSuccess {String[]} lines.line Can have more than one item - depends on how many route variants.
   * For each variant: 0th Element - Origin (or full name if length 1), 1st Element - Destination. 2nd Element - Via.
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "meta": {
   *         "prefix": "nz-akl",
   *         "name": "Tāmaki Makaurau",
   *         "secondaryName": "Auckland"
   *         "longName": "Tāmaki Makaurau, Auckland"
   *       },
   *       "friendlyNames": {
   *         "380": "Airporter"
   *       },
   *       "colors": {
   *         "380": "#2196F3"
   *       },
   *       "icons": {
   *         "380": "nz/at-metro-airporter"
   *       },
   *       "groups": [
   *         {
   *           "name": "Congestion Free Network",
   *           "items": [
   *             "380"
   *           ]
   *         }
   *       ],
   *       "lines": {
   *         "380": [
   *           [
   *             "Onehunga",
   *             "Manukau",
   *             "Airport"
   *           ],
   *           [
   *             "Howick",
   *             "Pukekohe",
   *             "Airport"
   *           ]
   *         ]
   *       }
   *     }
   *
   */
  getLines = (req: WakaRequest<null, null>, res: Response) => {
    res.send(this._getLines())
  }

  _getLines = () => {
    const { prefix, lineDataSource, cityMetadata } = this
    // if the region has multiple cities
    let city = cityMetadata[prefix]
    if (!Object.prototype.hasOwnProperty.call(city, 'name')) {
      city = city[prefix]
    }

    return {
      meta: {
        prefix,
        name: cityMetadata[prefix].name,
        secondaryName: cityMetadata[prefix].secondaryName,
        longName: cityMetadata[prefix].longName,
      },
      colors: lineDataSource.lineColors,
      icons: lineDataSource.lineIcons,
      friendlyNames: lineDataSource.friendlyNames,
      friendlyNumbers: lineDataSource.friendlyNumbers,
      groups: lineDataSource.lineGroups,
      lines: lineDataSource.allLines,
      operators: lineDataSource.lineOperators,
    }
  }

  /**
   * @api {get} /:region/line/:line Info - by route_short_name
   * @apiName GetLine
   * @apiGroup Lines
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} line route_short_name of particular line
   *
   * @apiSuccess {Object[]} line All the variants for a particular line.
   * @apiSuccess {String} line.route_id GTFS route_id
   * @apiSuccess {String} line.route_long_name Long name for route variant
   * @apiSuccess {String} line.route_short_name Short name for route variant
   * @apiSuccess {String} line.route_color Color for route
   * @apiSuccess {String} line.route_icon Icon for route (optional)
   * @apiSuccess {Number} line.direction_id Direction of route
   * @apiSuccess {String} line.shape_id GTFS Shape_id
   * @apiSuccess {Number} line.route_type GTFS route_type - Transport mode
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * [
   *   {
   *     "route_id": "50140-20171113160906_v60.12",
   *     "route_long_name": "Britomart Train Station to Manukau Train Station",
   *     "route_short_name": "EAST",
   *     "route_color": "#f39c12",
   *     "route_icon": "nz/at-metro-eastern",
   *     "direction_id": 1,
   *     "shape_id": "1199-20171113160906_v60.12",
   *     "route_type": 2
   *   },
   *   {
   *     "route_id": "50151-20171113160906_v60.12",
   *     "route_long_name": "Manukau Train Station to Britomart Train Station",
   *     "route_short_name": "EAST",
   *     "route_color": "#f39c12",
   *     "route_icon": "nz/at-metro-eastern",
   *     "direction_id": 0,
   *     "shape_id": "1198-20171113160906_v60.12",
   *     "route_type": 2
   *   }
   * ]
   */
  getLine = async (req: Request, res: Response) => {
    const lineId = req.params.line.trim()
    const agencyId = (req.query.agency_id || '').trim()

    try {
      const data = await this._getLine(lineId, agencyId)
      res.send(data)
    } catch (err) {
      this.logger.error(err)
      res.status(500).send({ message: 'Internal Server Error' })
    }
  }

  _getLine = async (lineId: string, agencyId: string) => {
    const { connection, lineDataSource } = this
    const sqlRequest = connection.get().request()

    // filter by agency if a filter exists
    let agency = ''
    if (agencyId !== '') {
      agency = 'and routes.agency_id = @agency_id'
      sqlRequest.input('agency_id', sql.VarChar(50), agencyId)
    }
    sqlRequest.input('route_short_name', sql.VarChar(50), lineId)

    const query = `
      SELECT
        routes.route_id,
        routes.agency_id,
        routes.route_short_name,
        routes.route_long_name,
        routes.route_type,
        trips.shape_id,
        trips.trip_headsign,
        trips.direction_id,
        count(trips.shape_id) as shape_score
      FROM routes
          LEFT JOIN trips on
          trips.route_id = routes.route_id
      WHERE
          routes.route_short_name = @route_short_name
          and shape_id is not null
          ${agency}
      GROUP BY
        routes.route_id,
        routes.agency_id,
        routes.route_short_name,
        routes.route_long_name,
        routes.route_type,
        trips.shape_id,
        trips.trip_headsign,
        trips.direction_id
      ORDER BY
        shape_score desc`

    const result = await sqlRequest.query<{
      route_id: string
      agency_id: string
      route_short_name: string
      route_long_name: string
      route_type: number
      shape_id: string
      trip_headsign: string
      direction_id: string
      shape_score: number
    }>(query)
    const versions = {}
    const results: {
      route_id: string
      agency_id: string
      route_long_name: string
      route_short_name: string
      route_color: any
      route_icon: any
      direction_id: string
      shape_id: string
      route_type: number
    }[] = []
    result.recordset.forEach(route => {
      // checks to make it's the right route (the whole exception thing)
      if (this.exceptionCheck(route) === false) {
        return
      }
      // make sure it's not already in the response
      if (
        typeof versions[route.route_long_name + (route.direction_id || '0')] ===
        'undefined'
      ) {
        versions[route.route_long_name + (route.direction_id || '0')] = true
      } else {
        return
      }

      const result = {
        route_id: route.route_id,
        agency_id: route.agency_id,
        route_long_name: route.route_long_name,
        route_short_name: route.route_short_name,
        route_color: this.getColor(route.agency_id, route.route_short_name),
        route_icon: this.getIcon(route.agency_id, route.route_short_name),
        direction_id: route.direction_id,
        shape_id: route.shape_id,
        route_type: route.route_type,
      }
      // if it's the best match, inserts at the front
      if (this.exceptionCheck(route, true) === true) {
        results.unshift(result)
        return
      }
      results.push(result)
    })
    if (results.length === 2) {
      if (results[0].route_long_name === results[1].route_long_name) {
        let candidate = results[1]
        if (results[0].direction_id !== 1) {
          candidate = results[0]
        }
        const regexed = candidate.route_long_name.match(/\((.+?)\)/g)
        if (regexed) {
          const newName = `(${regexed[0]
            .slice(1, -1)
            .split(' - ')
            .reverse()
            .join(' - ')})`
          candidate.route_long_name = candidate.route_long_name.replace(
            /\((.+?)\)/g,
            newName
          )
        } else {
          candidate.route_long_name = candidate.route_long_name
            .split(' - ')
            .reverse()
            .join(' - ')
        }
      }
    }
    return results
  }

  /**
   * @api {get} /:region/shapejson/:shape_id Line Shape - by shape_id
   * @apiName GetShape
   * @apiGroup Lines
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} shape_id GTFS Shape_id for particular shape.
   *
   * @apiSuccess {String} type GeoJSON Shape Type
   * @apiSuccess {Object[]} coordinates GeoJSON Coordinates
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * {
   *   "type": "LineString",
   *   "coordinates": [
   *     [
   *         174.76848,
   *         -36.84429
   *     ],
   *     [
   *         174.76863,
   *         -36.84438
   *     ]
   *   ]
   * }
   */
  getShapeJSON = async (req: Request, res: Response) => {
    const { prefix, version, config, storageSvc } = this
    const containerName = config.shapesContainer
    const { shapeId } = req.params
    const fileName = `${prefix}/${version
      .replace('_', '-')
      .replace('.', '-')}/${Buffer.from(shapeId).toString('base64')}.json`

    await storageSvc.downloadStream(
      containerName,
      fileName,
      res,
      (blobError, data) => {
        if (blobError) {
          res.status(404)
        }
        res.end()
      }
    )
  }

  // TODO: Probably move these to the Auckland & Wellington Specific Files
  exceptionCheck = (route, bestMatchMode = false) => {
    const { prefix, lineDataSource } = this
    if (prefix !== 'nz-akl' && prefix !== 'nz-wlg') {
      return true
    }

    const { allLines } = lineDataSource

    // blanket thing for no schools
    if (route.trip_headsign === 'Schools') {
      return false
    }
    if (typeof allLines[route.route_short_name] === 'undefined') {
      return true
    }
    let retval = false
    let routes = allLines[route.route_short_name].slice()

    // new mode that we only find the best match
    if (bestMatchMode) {
      routes = [routes[0]]
    }
    routes.forEach(variant => {
      if (variant.length === 1 && route.route_long_name === variant[0]) {
        retval = true
        // normal routes - from x to x
      } else if (variant.length === 2) {
        const splitName = route.route_long_name.toLowerCase().split(' to ')
        if (
          variant[0].toLowerCase() === splitName[0] &&
          variant[1].toLowerCase() === splitName[1]
        ) {
          retval = true
          // reverses the order
        } else if (
          variant[1].toLowerCase() === splitName[0] &&
          variant[0].toLowerCase() === splitName[1] &&
          !bestMatchMode
        ) {
          retval = true
        }
        // handles via Flyover or whatever
      } else if (variant.length === 3) {
        const splitName = route.route_long_name.toLowerCase().split(' to ')
        if (
          splitName.length > 1 &&
          splitName[1].split(' via ')[1] === variant[2].toLowerCase()
        ) {
          splitName[1] = splitName[1].split(' via ')[0]
          if (
            variant[0].toLowerCase() === splitName[0] &&
            variant[1].toLowerCase() === splitName[1]
          ) {
            retval = true
            // reverses the order
          } else if (
            variant[1].toLowerCase() === splitName[0] &&
            variant[0].toLowerCase() === splitName[1] &&
            !bestMatchMode
          ) {
            retval = true
          }
        }
      }
    })
    return retval
  }

  /**
   * @api {get} /:region/stops/trip/:trip_id Line Stops - by trip_id
   * @apiName GetStopsByTrip
   * @apiGroup Lines
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} trip_id GTFS trip_id for particular trip
   *
   * @apiSuccess {Object[]} stops Array of stops
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * [
   *   {
   *     "stop_id": "9218",
   *     "stop_name": "Manukau Train Station",
   *     "stop_lat": -36.99388,
   *     "stop_lon": 174.8774,
   *     "departure_time": "1970-01-01T18:00:00.000Z",
   *     "departure_time_24": false,
   *     "stop_sequence": 1
   *   }
   * ]
   */
  getStopsFromTrip = async (
    req: WakaRequest<null, { tripId: string }>,
    res: Response
  ) => {
    const { connection, logger, stopsDataAccess, search, redis, prefix } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('trip_id', sql.VarChar(100), req.params.tripId)
    try {
      const result = await sqlRequest.query<{
        stop_id: string
        stop_name: string
        stop_lat: number
        stop_lon: number
        departure_time: Date
        departure_time_24: Date
        stop_sequence: Date
      }>(`
        SELECT
          stops.stop_code as stop_id,
          stops.stop_name,
          stops.stop_lat,
          stops.stop_lon,
          stop_times.departure_time,
          stop_times.departure_time_24,
          stop_times.stop_sequence
        FROM stop_times
        LEFT JOIN stops
          on stops.stop_id = stop_times.stop_id
        WHERE
          stop_times.trip_id = @trip_id
        ORDER BY stop_sequence`)

      // const stopRoutes = await stopsDataAccess.getRoutesForMultipleStops(
      //   result.recordset.map(i => i.stop_id)
      // )
      const promises = result.recordset.map(async i => {
        const redisresult = await redis.client.get(
          `waka-worker:${prefix}:stop-transfers:${i.stop_id}`
        )
        let transfers: string[] = []
        if (redisresult) {
          transfers = redisresult.split(',')
        }

        const transfersWithColors = transfers.map(j => [
          j,
          this.getColor(null, j),
        ])
        transfersWithColors.sort(sortFn)

        return { ...i, transfers: transfersWithColors }
      })
      const results = await Promise.all(promises)
      const sending = search.stopsFilter(results, 'keep')
      return res.send(sending)
    } catch (err) {
      logger.error({ err }, 'Could not get stops from trip.')
      res.status(500).send(err)
    }
  }

  /**
   * @api {get} /:region/stops/shape/:shape_id Line Stops - by shape_id
   * @apiName GetStopsByShape
   * @apiGroup Lines
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} shape_id GTFS shape_id for particular trip
   *
   * @apiSuccess {Object[]} stops Array of stops
   *
   * @apiSuccessExample Success-Response:
   * HTTP/1.1 200 OK
   * [
   *   {
   *     "stop_id": "9218",
   *     "stop_name": "Manukau Train Station",
   *     "stop_lat": -36.99388,
   *     "stop_lon": 174.8774,
   *     "departure_time": "1970-01-01T18:00:00.000Z",
   *     "departure_time_24": false,
   *     "stop_sequence": 1
   *   }
   * ]
   */
  getStopsFromShape = async (req: Request, res: Response) => {
    const { connection, logger } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('shape_id', sql.VarChar(100), req.params.shapeId)
    try {
      const result = await sqlRequest.query<{ trip_id: string }>(
        'SELECT TOP(1) trip_id FROM trips WHERE trips.shape_id = @shape_id'
      )

      // forwards the request on.
      const tripId = result.recordset[0].trip_id
      req.params.tripId = tripId
      this.getStopsFromTrip(req, res)
    } catch (err) {
      logger.error({ err }, 'Could not get stops from shape.')
      res.status(500).send({ message: 'Could not get stops from shape.' })
    }
  }

  getAllStops = async (req: Request, res: Response) => {
    const { connection, logger } = this
    const sqlRequest = connection.get().request()
    try {
      const result = await sqlRequest.query<{
        stop_name: string
        stop_id: string
      }>('select stop_name, stop_id from stops order by stop_name;')
      res.send(result.recordset)
    } catch (err) {
      logger.error({ err }, 'Could not get stops.')
      res.status(500).send({ message: 'Could not get stops' })
    }
  }

  stopTimesv2 = async (
    req: WakaRequest<null, { tripId: string }>,
    res: Response
  ) => {
    const {
      params: { tripId },
    } = req
    const { stopsDataAccess } = this
    const data = await stopsDataAccess.getBlockFromTrip(tripId)
    const promises = data.current.map(async i => {
      const redisresult = await this.redis.client.get(
        `waka-worker:${this.prefix}:stop-transfers:${i.stop_id}`
      )
      let transfers: string[] = []
      if (redisresult) {
        transfers = redisresult.split(',')
      }
      const transfersWithColors = transfers.map(j => [
        j,
        this.getColor(null, j),
      ])
      transfersWithColors.sort(sortFn)

      return { ...i, transfers: transfersWithColors }
    })
    const current = await Promise.all(promises)
    res.send({ ...data, current })
  }
}

export default Lines
