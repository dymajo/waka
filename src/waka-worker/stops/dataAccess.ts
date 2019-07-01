import * as sql from 'mssql'
import Connection from '../db/connection'
import {
  StopsDataAccessProps,
  RouteInfo,
  StopTime,
  TripRow,
} from '../../typings'

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
      .input('date', sql.Date, date)

    const result = await sqlRequest.execute<{
      trip_id: string
      stop_sequence: number
      departure_time: Date
      departure_time_24: Date
      stop_id: string
      trip_headsign: string
      shape_id: string
      direction_id: number
      start_date: Date
      end_date: Date
      route_short_name: string
      route_long_name: string
      route_type: number
      agency_id: string
      route_color: string
      stop_name: string
    }>(procedure)
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

  getStopTimesV2 = async (
    current: string,
    previous?: string,
    next?: string
  ) => {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const escapedTripIds =
      previous && next
        ? `'${current}', '${previous}', '${next}'`
        : previous
        ? `'${current}', '${previous}'`
        : next
        ? `'${current}', '${next}'`
        : `'${current}'`

    interface StopTime {
      trip_id: string
      pickup_type: number
      drop_off_type: number
      arrival_time: Date
      departure_time: Date
      stop_id: string
      stop_name: string
      trip_headsign: string
      route_short_name: string
    }
    const result = await sqlRequest.query<StopTime>(`
      select trips.trip_id, pickup_type, drop_off_type, arrival_time,departure_time,stop_times.stop_id,stop_name,trip_headsign,stop_headsign, route_short_name
      from stop_times
      inner join trips
      on stop_times.trip_id = trips.trip_id
      inner join stops
      on stop_times.stop_id = stops.stop_id
      inner join routes
on trips.route_id = routes.route_id
      where trips.trip_id in (${escapedTripIds})
      order by arrival_time
        `)

    const trips: {
      previous: StopTime[]
      current: StopTime[]
      next: StopTime[]
    } = {
      previous: [],
      current: [],
      next: [],
    }
    for (const stopTime of result.recordset) {
      switch (stopTime.trip_id) {
        case current:
          trips.current.push(stopTime)
          break
        case next:
          trips.next.push(stopTime)
          break
        case previous:
          trips.previous.push(stopTime)
          break
        default:
          break
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
