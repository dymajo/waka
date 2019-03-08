const sql = require('mssql')

class StopsDataAccess {
  constructor(props) {
    const { connection, prefix } = props
    this.connection = connection
    this.prefix = prefix

    this.stopRouteCache = new Map()
  }

  async getBounds() {
    const { connection } = this
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

  async getStopInfo(stopCode) {
    const { connection, prefix } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stopCode)

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
    data.prefix = prefix
    return data
  }

  async getStopTimes(stopCode, time, date, procedure = 'GetStopTimes') {
    const { connection } = this
    const sqlRequest = connection
      .get()
      .request()
      .input('stop_id', sql.VarChar(100), stopCode)
      .input('departure_time', sql.Time, time)
      .input('date', sql.Date, date)

    const result = await sqlRequest.execute(procedure)
    return result.recordset
  }

  async getTimetable(
    stopCode,
    routeId,
    date,
    direction,
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

    const result = await sqlRequest.execute(procedure)
    return result.recordset
  }

  async getRoutesForStop(stopCode) {
    const { connection } = this
    const cachedRoutes = this.stopRouteCache.get(stopCode)
    if (cachedRoutes !== undefined) {
      return cachedRoutes
    }

    const sqlRequest = connection
      .get()
      .request()
      .input('stop_code', sql.VarChar, stopCode)

    const result = await sqlRequest.query(`
      DECLARE @stop_id varchar(200)

      SELECT @stop_id = stop_id
      FROM stops
      WHERE stop_code = @stop_code

      SELECT
        route_short_name,
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

  async getRoutesForMultipleStops(stopCodes) {
    const { connection } = this
    const routesContainer = {}
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
      const result = await sqlRequest.query(`
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
}
module.exports = StopsDataAccess
