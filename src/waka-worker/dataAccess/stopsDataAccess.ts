import * as sql from 'mssql'
import { DBStopTime, RouteInfo, StopTime, TripInfo, TripRow } from '../../types'
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
    const { connection } = this
    const routesContainer: {
      [stopCode: string]: {
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

    if (filteredStopCodes.length > 0) {
      // TODO: This isn't SQL Injection Proof, but it shouldn't be hit from there anyway.
      // This should also be a stored procedure.
      const stopCodesQuery = `('${filteredStopCodes.join("','")}')`

      const sqlRequest = connection.get().request()
      const result = await sqlRequest.query<{
        agency_id: string
        stop_code: string
        route_short_name: string
        trip_headsign: string
        direction_id: number
      }>(`
        DECLARE @stop_id varchar(200)

        SELECT stop_id, stop_code
        INTO #stops
        FROM stops
        WHERE stop_code in ${stopCodesQuery}

        SELECT
          #stops.stop_code,
          agency_id,
          route_short_name,
          trip_headsign,
          direction_id
        FROM stop_times
          JOIN #stops on stop_times.stop_id = #stops.stop_id
          JOIN trips ON trips.trip_id = stop_times.trip_id
          JOIN routes ON routes.route_id = trips.route_id
        WHERE
          pickup_type <> 1
        GROUP BY
          #stops.stop_code,
          agency_id,
          route_short_name,
          trip_headsign,
          direction_id
        ORDER BY
          #stops.stop_code,
          agency_id,
          route_short_name,
          direction_id,
          -- this is so it chooses normal services first before expresses or others
          count(trip_headsign) desc

        DROP TABLE #stops;
      `)

      result.recordset.forEach(record => {
        if (routesContainer[record.stop_code] === undefined) {
          routesContainer[record.stop_code] = []
        }

        routesContainer[record.stop_code].push({
          agency_id: record.agency_id,
          route_short_name: record.route_short_name,
          trip_headsign: record.trip_headsign,
          direction_id: record.direction_id,
        })
      })
    }

    Object.keys(routesContainer).forEach(stopCode => {
      this.stopRouteCache.set(stopCode, routesContainer[stopCode])
    })

    return routesContainer
  }

  getRouteInfo = async (tripId: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('tripId', sql.VarChar, tripId)

    const result = await sqlRequest.query<RouteInfo>(`
      SELECT route_short_name, route_long_name, route_desc, route_type, route_color, route_text_color from routes
      INNER JOIN trips on routes.route_id = trips.route_id
      WHERE trip_id = @tripId`)
    const routeInfo = result.recordset[0]
    routeInfo.route_color = `#${routeInfo.route_color}`
    return routeInfo
  }

  getStopTimesV2 = async (
    current: string,
    previous?: string,
    next?: string
  ) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const escapedTripIds =
      previous && next
        ? ` '${previous}', '${next}'`
        : previous
          ? ` '${previous}'`
          : next
            ? ` '${next}'`
            : ''

    const result = await sqlRequest.query<StopTime>(`
      SELECT
        CASE
          WHEN st.arrival_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), st.arrival_time) + 86400
          ELSE DATEDIFF(s, cast('00:00' AS TIME), st.arrival_time)
        END AS new_arrival_time,
        CASE
          WHEN st.departure_time_24 = 1 THEN DATEDIFF(s, cast('00:00' AS TIME), st.departure_time) + 86400
          ELSE DATEDIFF(s, cast('00:00' AS TIME), st.departure_time)
        END AS new_departure_time,
        t.trip_id,
        pickup_type,
        drop_off_type,
        arrival_time,
        departure_time,
        st.stop_id,
        stop_code,
        stop_name,
        stop_lat,
        stop_lon,
        trip_headsign,
        stop_headsign,
        route_short_name,
        stop_sequence,
        s.parent_station
      FROM stop_times st
      INNER JOIN trips t
      ON st.trip_id = t.trip_id
      INNER JOIN stops s
      ON st.stop_id = s.stop_id
      INNER JOIN routes r
      ON t.route_id = r.route_id
      WHERE t.trip_id = '${current}'
      ORDER BY stop_sequence
      `)
    const sqlRequest2 = connection.get().request()
    let result2
    const routeInfo = await this.getRouteInfo(current)

    const trips: {
      current: StopTime[]
      previous?: TripInfo
      next?: TripInfo
      routeInfo: RouteInfo
    } = {
      current: result.recordset,
      routeInfo,
    }
    if (escapedTripIds) {
      result2 = await sqlRequest2.query<TripInfo>(`
        select trip.trip_id, route.route_long_name,  route.route_short_name,route.route_color, stop_time.departure_time  from trips trip
        inner join routes route
        on route.route_id = trip.route_id
        inner join stop_times stop_time
        on stop_time.trip_id = trip.trip_id
        where trip.trip_id in (${escapedTripIds}) and stop_time.stop_sequence = (SELECT MIN(stop_sequence) from stop_times where trip_id = trip.trip_id)
      `)
      for (const trip of result2.recordset) {
        if (trip.trip_id === previous) {
          trips.previous = trip
        }
        if (trip.trip_id === next) {
          trips.next = trip
        }
      }
    }

    return trips
  }

  getBlockFromTrip = async (tripId: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('tripId', sql.VarChar, tripId)

    const result = await sqlRequest.query<TripRow>(
      `
      SELECT  trips.trip_id,
              trip_headsign,
              min(arrival_time) AS start_time,
              row_number() OVER (
                                ORDER BY min(arrival_time)) AS row_number
      FROM trips
      INNER JOIN stop_times ON trips.trip_id = stop_times.trip_id
      WHERE block_id =
          (SELECT CASE
                WHEN block_id = '' THEN 'there is no block id '
                ELSE block_id
          END
      FROM trips
      WHERE trip_id = @tripId )
      GROUP BY  trips.trip_id,
                trips.trip_headsign
      `
    )

    const numberOfTrips = result.rowsAffected[0]
    const currentIdx = result.recordset.map(el => el.trip_id).indexOf(tripId)
    const previous = result.recordset[currentIdx - 1]
    const next = result.recordset[currentIdx + 1]
    const current = result.recordset[currentIdx]

    if (numberOfTrips === 0 || (previous === undefined && next === undefined)) {
      return this.getStopTimesV2(tripId)
    }
    if (numberOfTrips === currentIdx + 1) {
      return this.getStopTimesV2(current.trip_id, previous.trip_id)
    }
    if (currentIdx === 0) {
      return this.getStopTimesV2(current.trip_id, undefined, next.trip_id)
    }
    return this.getStopTimesV2(current.trip_id, previous.trip_id, next.trip_id)
  }

  getPlatforms = async (parent_station: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('parent_station', parent_station)
    const result = await sqlRequest.query<{
      stop_code: string
      stop_name: string
    }>(`
      select s.stop_code, s.stop_name from stops s where s.parent_station = @parent_station
    `)
    const platforms = result.recordset.map(record => {
      const platformSplit = record.stop_name.split(' Platform ')
      if (platformSplit.length === 2) {
        return {
          stop_name: `Platform ${platformSplit[1]}`,
          stop_code: record.stop_code,
        }
      }
      return record
    })

    return platforms
  }

  checkSiblingStations = async (stop1: string, stop2: string) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('stop1', stop1)
    sqlRequest.input('stop2', stop2)
    const result = await sqlRequest.query<{
      stop_code: string
    }>(`select p.stop_code from stops s1
    inner join stops p
    on s1.parent_station = p.stop_id
    inner join stops s2
    on s2.parent_station = p.stop_id
    where s2.stop_code = @stop1 and s1.stop_code = @stop2;`)

    return result.recordset.length === 1
  }
}
export default StopsDataAccess
