import Connection from '../db/connection'
import StopsSqlRepostory from './sql/stopsSqlRepository'

interface StopsDataAccessProps {
  connection: Connection
  prefix: string
}

class StopsDataAccess {
  connection: Connection
  prefix: string
  stopIdCache: Map<string, string>
  stopRouteCache: Map<
    string,
    {
      route_id: string
      agency_id: string
      route_short_name: string
      trip_headsign: string
      direction_id: number
    }[]
  >
  stopsSqlRepository: StopsSqlRepostory

  constructor(props: StopsDataAccessProps) {
    const { connection, prefix } = props
    this.connection = connection
    this.prefix = prefix

    this.stopsSqlRepository = new StopsSqlRepostory(connection)
    this.stopRouteCache = new Map()
  }

  async getBounds() {
    const result = await this.stopsSqlRepository.getBounds()
    const bounds = result[0]
    return {
      lat: { min: bounds.lat_min, max: bounds.lat_max },
      lon: { min: bounds.lon_min, max: bounds.lon_max },
    }
  }

  async getStopInfo(stopCode: string) {
    const result = await this.stopsSqlRepository.getStopInfo(stopCode)
    if (result.length === 0) {
      throw new Error('404')
    }
    return { ...result[0], prefix: this.prefix }
  }

  getStopTimes = async (
    stopCode: string,
    time: Date,
    date: Date,
    procedure = 'GetStopTimes'
  ) => {
    // TODO: Pull more of the controller logic into here
    return this.stopsSqlRepository.getStopTimes(stopCode, time, date, procedure)
  }

  async getTimetable(
    stopCode: string,
    routeId: string,
    date: Date,
    direction: string,
    procedure = 'GetTimetable'
  ) {
    // TODO: Pull more of the controller logic into here
    return this.stopsSqlRepository.getTimetable(
      stopCode,
      routeId,
      date,
      direction,
      procedure
    )
  }

  async getTransfers() {
    const stopsToRoutes = {}
    const routesAtStopsRecordset = await this.stopsSqlRepository.getRoutesAtStops()

    // turns the table into a map with arrays
    routesAtStopsRecordset.forEach(record => {
      const { stop_id, route_short_name, agency_id } = record
      if (stopsToRoutes[stop_id] === undefined) {
        stopsToRoutes[stop_id] = new Set()
      }
      stopsToRoutes[stop_id].add([agency_id, route_short_name].join('/'))
    })

    // now get the parents, and pop the transfers into the parents
    const parents = await this.stopsSqlRepository.getParentStops()
    parents.forEach(record => {
      const { stop_id, parent_station } = record
      if (stopsToRoutes[parent_station] === undefined) {
        stopsToRoutes[parent_station] = new Set()
      }
      Array.from(stopsToRoutes[stop_id] || []).forEach(route => {
        stopsToRoutes[parent_station].add(route)
      })
    })

    // now convert everything to a regular dict
    Object.keys(stopsToRoutes).forEach(key => {
      stopsToRoutes[key] = Array.from(stopsToRoutes[key])
    })

    return stopsToRoutes
  }

  async getRoutesForMultipleStops(stopCodes: string[]) {
    const routesContainer: {
      [stopCode: string]: {
        route_id: string
        agency_id: string
        route_short_name: string
        trip_headsign: string
        direction_id: number
      }[]
    } = {}
    const filteredStopCodes = stopCodes.filter(stopCode => {
      const cachedRoutes = this.stopRouteCache.get(stopCode)
      if (cachedRoutes !== undefined) {
        routesContainer[stopCode] = cachedRoutes
        return false
      }
      return true
    })

    const routes = await this.stopsSqlRepository.getRoutes(filteredStopCodes)
    routes.forEach(record => {
      if (routesContainer[record.stop_code] === undefined) {
        routesContainer[record.stop_code] = []
      }

      routesContainer[record.stop_code].push({
        route_id: record.route_id,
        agency_id: record.agency_id,
        route_short_name: record.route_short_name,
        trip_headsign: record.trip_headsign,
        direction_id: record.direction_id,
      })
    })

    Object.keys(routesContainer).forEach(stopCode => {
      this.stopRouteCache.set(stopCode, routesContainer[stopCode])
    })

    return routesContainer
  }

  getBlockFromTrip = async (tripId: string) => {
    const trips = await this.stopsSqlRepository.getBlock(tripId)
    const currentIndex = trips.map(el => el.trip_id).indexOf(tripId)
    const previous = trips[currentIndex - 1]
    const next = trips[currentIndex + 1]
    const current = trips[currentIndex]

    if (trips.length === 0 || (previous === undefined && next === undefined)) {
      return this.getStopTimesForTrip(tripId)
    }
    if (trips.length === currentIndex + 1) {
      return this.getStopTimesForTrip(current.trip_id, previous.trip_id)
    }
    if (currentIndex === 0) {
      return this.getStopTimesForTrip(current.trip_id, undefined, next.trip_id)
    }
    return this.getStopTimesForTrip(current.trip_id, previous.trip_id, next.trip_id)
  }

  getStopTimesForTrip = async (
    current: string,
    previous?: string,
    next?: string
  ) => {

    const nextTripIds = [previous, next].filter(i => i != null)
    const [routeInfo, currentStops, tripInfo] = await Promise.all([
      await this.stopsSqlRepository.getRouteInfo(current),
      await this.stopsSqlRepository.getStopTimesForTrip(current),
      await this.stopsSqlRepository.getTripInfo(nextTripIds)
    ])

    const trips = {
      routeInfo: routeInfo[0],
      current: currentStops,
      previous: null,
      next: null,
    }

    tripInfo.forEach(trip => {
      if (trip.trip_id === previous) {
        trips.previous = trip
      } else if (trip.trip_id === next) {
        trips.next = trip
      }
    })
    return trips
  }

  getPlatforms = async (parentStation: string) => {
    const platforms = await this.stopsSqlRepository.getSiblingStations(parentStation)
    return platforms.map(record => {
      const platformSplit = record.stop_name.split(' Platform ')
      if (platformSplit.length === 2) {
        return {
          stop_name: `Platform ${platformSplit[1]}`,
          stop_code: record.stop_code,
        }
      }
      return record
    })
  }

  checkSiblingStations = async (stop1: string, stop2: string) => {
    const siblings = await this.stopsSqlRepository.checkSiblingStations(stop1, stop2)
    return siblings.length === 1
  }
}
export default StopsDataAccess
