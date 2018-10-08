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
  async getRoutesForStop(stop_code) {
    const cachedRoutes = this.stopRouteCache.get(stop_code)
    if (cachedRoutes !== undefined) {
      return cachedRoutes
    }

    const sqlRequest = connection.get().request()
    sqlRequest.input('stop_code', sql.VarChar, stop_code)

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
