import * as sql from 'mssql'
import Connection from '../../db/connection'
import { DBStopTime } from '../../../types'

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

    const result = await sqlRequest.execute<DBStopTime>(procedure)
    return Array.from(result.recordset)
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
    return Array.from(result.recordset)
  }

  async getRoutesAtStops() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const data = await sqlRequest.query<{
      stop_id: string
      route_short_name: string
      agency_id: string
    }>(`
      SELECT DISTINCT stops.stop_id, route_short_name, agency_id
      FROM trips
      INNER JOIN stop_times ON stop_times.trip_id = trips.trip_id
      INNER JOIN stops ON stops.stop_id = stop_times.stop_id
      INNER JOIN routes ON routes.route_id = trips.route_id
      WHERE
          (pickup_type = 0 or drop_off_type = 0) AND route_type <> 712
      ORDER BY stop_id;
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
      SELECT stop_id, parent_station
      FROM stops
      WHERE parent_station IS NOT NULL
    `)
    return Array.from(data.recordset)
  }
}
