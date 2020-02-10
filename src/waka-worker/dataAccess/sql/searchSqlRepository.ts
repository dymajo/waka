import * as sql from 'mssql'
import Connection from '../../db/connection'

export default class SearchSqlRepository {
  connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  async getStopsRouteType() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query<{
      stop_id: string
      route_type: number
    }>(`
      SELECT DISTINCT stops.stop_code AS stop_id, routes.route_type
      FROM stops
      JOIN stop_times ON stop_times.stop_id = stops.stop_id
      JOIN trips ON trips.trip_id = stop_times.trip_id
      JOIN routes ON routes.route_id = trips.route_id
      WHERE route_type <> 3 and route_type <> 700 and route_type <> 712
      ORDER BY stop_code`
    )
    return Array.from(result.recordset)
  }

  async getAllStops() {
    const { connection } = this
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query<{
      stop_id: string
      stop_name: string
    }>(`
      SELECT
        stop_code as stop_id,
        stop_name
      FROM stops
      WHERE location_type = 0 OR location_type IS NULL
      ORDER BY
        len(stop_code),
        stop_code
    `)
    return Array.from(result.recordset)
  }

  async getStops(latGreaterThan: number, latLessThan: number, lonGreaterThan: number, lonlessThan: number, locationFilter: number = 0) {
    const { connection } = this
    const sqlRequest = connection.get().request()
    sqlRequest.input('stop_lat_gt', sql.Decimal(10, 6), latGreaterThan)
    sqlRequest.input('stop_lat_lt', sql.Decimal(10, 6), latLessThan)
    sqlRequest.input('stop_lon_gt', sql.Decimal(10, 6), lonGreaterThan)
    sqlRequest.input('stop_lon_lt', sql.Decimal(10, 6), lonlessThan)

    let locationQuery = '(location_type = 0 OR location_type IS NULL)'
    if (locationFilter === 1) {
      locationQuery = `(
        (location_type is null and parent_station is null) OR
        (location_type = 1 and parent_station is null) OR
        (location_type = 0 and parent_station is null)
      )`
    }

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
    return Array.from(result.recordset)
  }
}
