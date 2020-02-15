import * as sql from 'mssql'
import Connection from '../../db/connection'
import { DBStopTime, StopTime } from '../../../types'

// Only put SQL in here - this is so we can mock it out for unit tests
export default class StopsSqlRepostory {
  connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  async getBounds() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query<{
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
      FROM stops;
    `)
    return Array.from(data.recordset)
  }

  async getStopInfo(stopCode: string) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stopCode)

    const data = await sqlRequest.query<{
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
    return Array.from(data.recordset)
  }

  async getRouteInfo(tripId: string) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('trip_id', tripId)
    const data = await sqlRequest.query<{
      agency_id: string
      route_short_name: string
      route_long_name: string
      route_desc: string
      route_type: number
      route_color: string
      route_text_color: string
    }>(`
      SELECT agency_id, route_short_name, route_long_name, route_desc, route_type, route_color, route_text_color from routes
      INNER JOIN trips on routes.route_id = trips.route_id
      WHERE trip_id = @trip_id
    `)
    // only exception for transformations here, because it's stored in the db wrong
    return Array.from(data.recordset.map(record => ({
      ...record,
      route_color: `#${record.route_color || '000000'}`,
      route_text_color: `#${record.route_text_color || 'ffffff'}`,
    })))
  }

  async getStopTimes(
    stopCode: string,
    time: Date,
    date: Date,
    procedure: string
  ) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stopCode)
      .input('departure_time', sql.Time, time)
      .input('departure_date', sql.Date, date)

    const data = await sqlRequest.execute<DBStopTime>(procedure)
    return Array.from(data.recordset)
  }

  async getStopTimesForTrip(tripId: string) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('trip_id', tripId)
    const data = await sqlRequest.query<StopTime>(`
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
      WHERE t.trip_id = @trip_id
      ORDER BY stop_sequence
    `)
    return Array.from(data.recordset)
  }

  async getTripInfo(tripIds: string[]) {
    if (tripIds.length === 0) {
      return []
    }
    const { connection } = this
    const sqlRequest = connection.get().request()
    const escapedTripIds = `('${tripIds.join('\', \'')}')`
    const data = await sqlRequest.query<{
      trip_id: string
      route_long_name: string
      route_short_name: string
      route_color: string
      route_text_color: string
      departure_time: Date
    }>(`
      SELECT
        trips.trip_id,
        routes.agency_id,
        routes.route_short_name,
        routes.route_long_name, 
        routes.route_color, 
        routes.route_text_color,
        stop_times.departure_time 
      FROM trips
      INNER JOIN routes ON routes.route_id = trips.route_id
      INNER JOIN stop_times ON stop_times.trip_id = trips.trip_id
      WHERE
        trips.trip_id in ${escapedTripIds}
        AND stop_times.stop_sequence = (SELECT MIN(stop_sequence) FROM stop_times where trip_id = trips.trip_id)
      ORDER BY trip_id
    `)
    return Array.from(data.recordset.map(record => ({
      ...record,
      route_color: `#${record.route_color || '000000'}`,
      route_text_color: `#${record.route_text_color || 'ffffff'}`,
    })))
  }

  async getTimetable(
    stopCode: string,
    routeId: string,
    date: Date,
    direction: string,
    procedure: string
  ) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stopCode)
      .input('route_short_name', sql.VarChar(50), routeId)
      .input('date', sql.Date, date)
      .input('direction', sql.Int, direction)
    const data = await sqlRequest.execute<{
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
    return Array.from(data.recordset)
  }

  async getRoutesAtStops() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query<{
      stop_id: string
      route_short_name: string
      agency_id: string
    }>(`
      SELECT DISTINCT stops.stop_code as stop_id, route_short_name, agency_id
      FROM trips
      INNER JOIN stop_times ON stop_times.trip_id = trips.trip_id
      INNER JOIN stops ON stops.stop_id = stop_times.stop_id
      INNER JOIN routes ON routes.route_id = trips.route_id
      WHERE
          (pickup_type = 0 or drop_off_type = 0) AND route_type <> 712
      ORDER BY stop_code;
    `)
    return Array.from(data.recordset)
  }

  async getRoutes(stopCodes: string[]) {
    if (stopCodes.length === 0) {
      return []
    }
    const { connection } = this
    const stopCodesQuery = `('${stopCodes.join("','")}')`
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query<{
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
        AND routes.route_type <> 712
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
    return Array.from(data.recordset)
  }

  async getParentStops() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query<{
      stop_id: string
      parent_station: string
    }>(`
      SELECT stop_code as stop_id, parent_station
      FROM stops
      WHERE parent_station IS NOT NULL
    `)
    return Array.from(data.recordset)
  }

  async getBlock(tripId: string) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('trip_id', tripId)
    const data = await sqlRequest.query<{
      trip_id: string
      start_time: Date
      row_number: number
      trip_headsign: string
    }>(`
      SELECT 
        trips.trip_id,
        trip_headsign,
        min(arrival_time) AS start_time,
        row_number() OVER (ORDER BY min(arrival_time)) AS row_number
      FROM trips
      INNER JOIN stop_times ON trips.trip_id = stop_times.trip_id
      WHERE block_id =
        (SELECT 
          CASE 
            WHEN block_id = '' 
            THEN 'there is no block id '
            ELSE block_id
          END
          FROM trips
          WHERE trip_id = @trip_id
        )
      GROUP BY trips.trip_id, trips.trip_headsign
    `)
    return Array.from(data.recordset)
  }

  async getSiblingStations(parentStation: string) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('parent_station', parentStation)
    const data = await sqlRequest.query<{
      stop_code: string
      stop_name: string
    }>(`
      SELECT stop_code, stop_name
      FROM stops
      WHERE parent_station = @parent_station
    `)
    return Array.from(data.recordset)
  }

  async checkSiblingStations(stop1: string, stop2: string) {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop1', stop1)
      .input('stop2', stop2)
    const data = await sqlRequest.query<{
      stop_code: string
    }>(`
      SELECT p.stop_code FROM stops s1
      INNER JOIN stops p ON s1.parent_station = p.stop_id
      INNER JOIN stops s2 ON s2.parent_station = p.stop_id
      WHERE s2.stop_code = @stop1 AND s1.stop_code = @stop2;
    `)
    return Array.from(data.recordset)
  }
}
