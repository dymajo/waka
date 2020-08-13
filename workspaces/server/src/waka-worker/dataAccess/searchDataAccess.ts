import * as Logger from 'bunyan'
import Connection from '../db/connection'
import SearchSqlRepository from './sql/searchSqlRepository'

interface SearchDataAccessProps {
  connection: Connection
  prefix: string
  logger: Logger
}

type RouteTypes = { [stop_id: string]: number }

export default class SearchDataAccess {
  connection: Connection
  logger: Logger
  prefix: string
  routeTypesCache: RouteTypes
  searchSqlRepository: SearchSqlRepository

  constructor(props: SearchDataAccessProps) {
    const { logger, connection, prefix } = props
    this.logger = logger
    this.prefix = prefix

    this.routeTypesCache = {}
    this.searchSqlRepository = new SearchSqlRepository(connection)
  }

  async start() {
    const { logger } = this
    try {
      const routeTypesCache = await this.getStopsRouteType()
      this.routeTypesCache = routeTypesCache
    } catch (err) {
      logger.error(
        { err },
        'Could not load all stops route types from database'
      )
    }
  }

  async getStopsRouteType() {
    const recordset = await this.searchSqlRepository.getStopsRouteType()
    const routeTypes: RouteTypes = {}
    recordset.forEach(stop => {
      routeTypes[stop.stop_id] = stop.route_type
    })
    return routeTypes
  }

  async getAllStops() {
    const { routeTypesCache } = this
    const recordset = await this.searchSqlRepository.getAllStops()
    const items = recordset.map(stop => {
      const { stop_id, stop_name } = stop
      return {
        stop_id,
        stop_name,
        // it's a bus if it's not in the cache
        route_type: routeTypesCache[stop_id] || 3,
      }
    })
    return { items }
  }

  async getStops(lat: number, lon: number, distance: number) {
    const { prefix, routeTypesCache, logger } = this
    const latDist = distance / 100000
    const lonDist = distance / 65000
    const stopLatGt = lat - latDist
    const stopLatLt = lat + latDist
    const stopLngGt = lon - lonDist
    const stopLngLt = lon + lonDist

    const locationFilter = (prefix === 'au-syd' ? 1 : 0)
    const recordset = await this.searchSqlRepository.getStops(stopLatGt, stopLatLt, stopLngGt, stopLngLt, locationFilter)

    const items = recordset.map(item => ({
      ...item,
      stop_region: prefix,
      route_type: routeTypesCache[item.stop_id] || 3,
    }))
    return { items }
  }
}
