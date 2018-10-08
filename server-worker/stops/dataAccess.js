const sql = require('mssql')
const connection = require('../db/connection.js')

class StopsDataAccess {
  constructor() {
    this.stopRouteCache = new Map()
  }
  async getBounds() {
    const sqlRequest = connection.get().request()
    const result = await sqlRequest.query(`
      SELECT
        MIN(stop_lat) as lat_min,
        MAX(stop_lat) as lat_max,
        MIN(stop_lon) as lon_min,
        MAX(stop_lon) as lon_max
      FROM stops;`)

    const data = result.recordset[0]
    return data
  }
  async getStopInfo(stop_code) {
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stop_code)

    const result = await sqlRequest.query(`
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
    const data = result.recordset[0]
    data.prefix = global.config.prefix
    return data
  }
  async getStopTimes(stop_code, time, date, procedure = 'GetStopTimes') {
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stop_code)
      .input('departure_time', sql.Time, time)
      .input('date', sql.Date, date)

    const result = await sqlRequest.execute(procedure)
    return result.recordset
  }
  async getTimetable(stop_code, route_id, date, direction, procedure = 'GetTimetable') {
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stop_code)
      .input('route_short_name', sql.VarChar(50), route_id)
      .input('date', sql.Date, date)
      .input('direction', sql.Int, direction)

    const result = await sqlRequest.execute(procedure)
    return result.recordset
  }
  async getRoutesForStop(stop_code) {
    const cachedRoutes = this.stopRouteCache.get(stop_code)
    if (cachedRoutes !== undefined) {
      return cachedRoutes
    }

    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stop_code)

    const result = await sqlRequest.query(`
      SELECT 
        route_short_name,
        trip_headsign,
        direction_id
      FROM stops 
        JOIN stop_times ON stop_times.stop_id = stops.stop_id
        JOIN trips ON trips.trip_id = stop_times.trip_id
        JOIN routes ON routes.route_id = trips.route_id
      WHERE stop_code = @stop_code
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
    this.stopRouteCache.set(stop_code, routes)
    return routes
  }
}
module.exports = StopsDataAccess
