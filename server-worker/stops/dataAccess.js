const sql = require('mssql')
const connection = require('../db/connection.js')

class StopsDataAccess {
  constructor() {
    this.stopRouteCache = new Map()
    this.collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }
  async getRoutesForStop(stop_code) {
    const cachedRoutes = this.stopRouteCache.get(stop_code)
    if (cachedRoutes !== undefined) {
      return cachedRoutes
    }

    const sqlRequest = connection.get().request()
    sqlRequest.input('stop_code', sql.VarChar, stop_code)

    const result = await sqlRequest.query(`
      SELECT DISTINCT
        route_short_name,
        direction_id
      FROM stops 
        JOIN stop_times ON stop_times.stop_id = stops.stop_id
        JOIN trips ON trips.trip_id = stop_times.trip_id
        JOIN routes ON routes.route_id = trips.route_id
      WHERE stop_code = @stop_code
    `)
    const routes = result.recordset.map(r => [r.route_short_name, r.direction_id])
    routes.sort(this.collator.compare)

    this.stopRouteCache.set(stop_code, routes)
    return routes
  }
}
module.exports = StopsDataAccess
