import * as sql from 'mssql'
import Connection from '../db/connection'
import {
  RouteInfo,
  StopTime,
  TripRow,
  TripInfo,
  DBStopTime,
} from '../../typings'

interface StopsDataAccessProps {
  connection: Connection
  prefix: string
}

class StopsDataAccess {
  connection: Connection
  prefix: string
  stopRouteCache: Map<
    string,
    {
      route_short_name: string
      trip_headsign: string
      direction_id: number
    }[]
  >
  constructor(props: StopsDataAccessProps) {
    const { connection, prefix } = props
    this.connection = connection
    this.prefix = prefix

    this.stopRouteCache = new Map()
  }

  async getBounds() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query<{
      lat_min: number
      lat_max: number
      lon_min: number
      lon_max: number
    }>(`
      SELECT
        MIN(stop_lat) as lat_min,
        MAX(stop_lat) as lat_max,
        MIN(stop_lon) as lon_min,
        MAX(stop_lon) as lon_max
      FROM stops;`)

    const data = result.recordset[0]
    return data
  }

  async getStopInfo(stopCode: string) {
    const { connection, prefix } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stopCode)

    const result = await sqlRequest.query<{
      stop_id: string
      stop_name: string
      stop_desc: string
      stop_lat: number
      stop_lon: number
      zone_id: string
      location_type: number
      parent_station: string
      stop_timezone: string
      wheelchair_boarding: number
      route_type: number
    }>(`
      SELECT
        stops.stop_code as stop_id,
        stops.stop_name,
        stops.stop_desc,
        stops.stop_lat,
        stops.stop_lon,
        stops.zone_id,
        stops.location_type,
        stops.parent_station,
        stops.stop_timezone,
        stops.wheelchair_boarding,
        routes.route_type
      FROM
        stops
      LEFT JOIN
        stop_times
      ON stop_times.id = (
          SELECT TOP 1 id
          FROM    stop_times
          WHERE
          stop_times.stop_id = stops.stop_id
      )
      LEFT JOIN trips ON trips.trip_id = stop_times.trip_id
      LEFT JOIN routes on routes.route_id = trips.route_id
      WHERE
        stops.stop_code = @stop_code
    `)
    const data = { ...result.recordset[0], prefix }
    return data
  }

  getStopTimes = async (
    stopCode: string,
    time: Date,
    date: Date,
    procedure = 'GetStopTimes'
  ) => {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stopCode)
      .input('departure_time', sql.Time, time)
      .input('departure_date', sql.Date, date)

    const result = await sqlRequest.execute<DBStopTime>(procedure)
    return result.recordset
  }

  async getTimetable(
    stopCode: string,
    routeId: string,
    date: Date,
    direction: string,
    procedure = 'GetTimetable'
  ) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stopCode)
      .input('route_short_name', sql.VarChar(50), routeId)
      .input('date', sql.Date, date)
      .input('direction', sql.Int, direction)

    const result = await sqlRequest.execute<{
      trip_id: string
      service_id: string
      shape_id: string
      trip_headsign: string
      direction_id: number
      stop_sequence: string
      departure_time: Date
      departure_time_24: Date
      route_id: string
      route_long_name: string
      agency_id: string
    }>(procedure)
    return result.recordset
  }

  async getRoutesForStop(stopCode: string) {
    const { connection } = this
    const cachedRoutes = this.stopRouteCache.get(stopCode)
    if (cachedRoutes !== undefined) {
      return cachedRoutes
    }

    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stopCode)

    const result = await sqlRequest.query<{
      route_short_name: string
      trip_headsign: string
      direction_id: number
    }>(`
      DECLARE @stop_id varchar(200)

      SELECT @stop_id = stop_id
      FROM stops
      WHERE stop_code = @stop_code

      SELECT
        trip_headsign,
        direction_id
      FROM stop_times
        JOIN trips ON trips.trip_id = stop_times.trip_id
        JOIN routes ON routes.route_id = trips.route_id
      WHERE stop_times.stop_id = @stop_id
      GROUP BY
        route_short_name,
        trip_headsign,
        direction_id
      ORDER BY
        route_short_name,
        direction_id,
        -- this is so it chooses normal services first before expresses or others
        count(trip_headsign) desc
    `)

    const routes = result.recordset
    this.stopRouteCache.set(stopCode, routes)
    return routes
  }

  getNullParentStationRouteStops = async () => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query<{
      stop_id: string
      route_short_name: string
    }>(`
      select distinct stops.stop_id,  route_short_name
      from trips
      inner join stop_times
      on stop_times.trip_id = trips.trip_id
      inner join stops
      on stops.stop_id = stop_times.stop_id
      inner join routes
      on routes.route_id = trips.route_id
      where (pickup_type = 0 or drop_off_type = 0 )and route_type <> 712 and parent_station is null
      group by stops.stop_id,route_short_name;
    `)
    const stops: { [stop_id: string]: string[] } = {}
    for (const { stop_id, route_short_name } of result.recordset) {
      if (Object.prototype.hasOwnProperty.call(stops, stop_id)) {
        stops[stop_id].push(route_short_name)
      } else {
        stops[stop_id] = [route_short_name]
      }
    }
    return stops
  }

  getParentStationRouteStops = async () => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query<{
      parent_station: string
      route_short_name: string
    }>(`
      select distinct parent_station, route_short_name
      from trips
      inner join stop_times
      on stop_times.trip_id = trips.trip_id
      inner join stops
      on stops.stop_id = stop_times.stop_id
      inner join routes
      on routes.route_id = trips.route_id
      where (pickup_type = 0 or drop_off_type = 0 ) and parent_station is not null
      group by parent_station,route_short_name
      order by parent_station;
    `)
    const parents: { [parent_station: string]: string[] } = {}
    const parentsMap = await this.getParentStops()
    const stops: { [stop_id: string]: string[] } = {}

    for (const { parent_station, route_short_name } of result.recordset) {
      if (Object.prototype.hasOwnProperty.call(parents, parent_station)) {
        parents[parent_station].push(route_short_name)
      } else {
        parents[parent_station] = [route_short_name]
      }
    }

    for (const { stop_id, parent_station } of parentsMap) {
      if (Object.prototype.hasOwnProperty.call(parents, parent_station)) {
        stops[stop_id] = parents[parent_station]
      }
    }

    return stops
  }

  getParentStops = async () => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query<{
      stop_id: string
      parent_station: string
    }>(`
      select stop_id, parent_station from stops where parent_station is not null;
    `)
    return result.recordset
  }

  getTransfers = async () => {
    const parents = await this.getParentStationRouteStops()
    const stops = await this.getNullParentStationRouteStops()
    const transfers = { ...parents, ...stops }
    return transfers
  }

  async getRoutesForMultipleStops(stopCodes: string[]) {
    const { connection } = this
    const routesContainer: {
      [stopCode: string]: {
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
          route_short_name,
          trip_headsign,
          direction_id
        FROM stop_times
          JOIN #stops on stop_times.stop_id = #stops.stop_id
          JOIN trips ON trips.trip_id = stop_times.trip_id
          JOIN routes ON routes.route_id = trips.route_id
        GROUP BY
          #stops.stop_code,
          route_short_name,
          trip_headsign,
          direction_id
        ORDER BY
          #stops.stop_code,
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
        trips.trip_id,
        pickup_type,
        drop_off_type,
        arrival_time,
        departure_time,
        stop_times.stop_id,
        stop_code,
        stop_name,
        stop_lat,
        stop_lon,
        trip_headsign,
        stop_headsign,
        route_short_name,
        stop_sequence
      FROM stop_times
      INNER JOIN trips
      ON stop_times.trip_id = trips.trip_id
      INNER JOIN stops
      ON stop_times.stop_id = stops.stop_id
      INNER JOIN routes
      ON trips.route_id = routes.route_id
      WHERE trips.trip_id = '${current}'
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

    if (numberOfTrips === 0) {
      return this.getStopTimesV2(tripId)
    }
    if (numberOfTrips === currentIdx + 1) {
      return this.getStopTimesV2(current.trip_id, previous.trip_id)
    }
    if (currentIdx === 0) {
      return this.getStopTimesV2(current.trip_id, null, next.trip_id)
    }
    return this.getStopTimesV2(current.trip_id, previous.trip_id, next.trip_id)
  }
}
export default StopsDataAccess
