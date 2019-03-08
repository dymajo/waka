const sql = require('mssql')

class Search {
  constructor(props) {
    const { logger, connection, prefix, stopsExtras } = props
    this.logger = logger
    this.connection = connection
    this.prefix = prefix
    this.regionSpecific = stopsExtras

    this.stopsRouteType = {}

    this._stopsFilter = this._stopsFilter.bind(this)
    this.all = this.all.bind(this)
    this._allStops = this._allStops.bind(this)
    this.getStopsRouteType = this.getStopsRouteType.bind(this)
    this.getStopsLatLon = this.getStopsLatLon.bind(this)
    this._stopsFromDb = this._stopsFromDb.bind(this)
  }

  start() {
    this.getStopsRouteType()
  }

  stop() {}

  _stopsFilter(recordset, mode) {
    const { prefix, regionSpecific } = this
    if (prefix === 'nz-wlg') {
      return regionSpecific.filter(recordset, mode)
    }
    return recordset
  }

  /**
   * @api {get} /:region/stations List - All
   * @apiName GetStations
   * @apiGroup Station
   * @apiDescription This returns all the stations in the region. You generally should not need to use this, use search instead.
   *
   * @apiParam {String} region Region of Worker
   *
   * @apiSuccess {Object} route_types Object with all stations that have route types != 3
   * @apiSuccess {Object[]} items  A list of all the stations
   * @apiSuccess {String} items.stop_id  Unique Stop Id for this station
   * @apiSuccess {String} items.stop_name  Station Name
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "route_types": {
   *         "133": 2
   *       },
   *       "items": [
   *         {
   *           "stop_id": "133",
   *           "stop_name": "Britomart Train Station"
   *         }
   *       ]
   *     }
   *
   */
  async all(req, res) {
    const { logger, _allStops } = this
    try {
      const data = await _allStops()
      res.send(data)
      return data
    } catch (err) {
      logger.error({ err })
      res.status(500).send(err)
      return err
    }
  }

  async _allStops() {
    const { logger, connection, stopsRouteType, _stopsFilter } = this
    try {
      const sqlRequest = connection.get().request()
      const result = await sqlRequest.query(
        `
        SELECT
          stop_code as stop_id,
          stop_name
        FROM
          stops
        WHERE
          location_type = 0 OR location_type IS NULL
        ORDER BY
          len(stop_code),
          stop_code
      `
      )
      return {
        route_types: stopsRouteType,
        items: _stopsFilter(result.recordset, 'delete'),
      }
    } catch (err) {
      logger.error({ err }, 'Could not get all stops from database.')
      throw err
    }
  }

  async getStopsRouteType() {
    const { logger, connection } = this
    const sqlRequest = connection.get().request()
    try {
      const result = await sqlRequest.query(
        `
        SELECT DISTINCT stops.stop_code AS stop_id, routes.route_type
        FROM stops
        JOIN stop_times ON stop_times.stop_id = stops.stop_id
        JOIN trips ON trips.trip_id = stop_times.trip_id
        JOIN routes ON routes.route_id = trips.route_id
        WHERE route_type <> 3
        ORDER BY stop_code`
      )

      const routeTypes = {}
      result.recordset.forEach(stop => {
        routeTypes[stop.stop_id] = stop.route_type
      })
      this.stopsRouteType = routeTypes
    } catch (err) {
      logger.error({ err }, 'Could not all stops route types from database.')
    }
  }

  /**
   * @api {get} /:region/station/search List - by Location
   * @apiName GetStationSearch
   * @apiGroup Station
   * @apiDescription Supply a latitude and a longitude, and you'll get all the stops back in that area.
   *
   * @apiParam {String} region="auto" Region of Worker, can be set to "auto" to automatically determine worker.
   * @apiParam {String} lat Latitude. Example: -41.2790
   * @apiParam {String} lon Longitude. Example: 174.7806
   * @apiParam {number{0-1250}} distance Search Distance. Example: 380
   *
   * @apiSuccess {Object[]} items A list of all the stations. Not actually called items, the root object is an array.
   * @apiSuccess {String} items.stop_id  Unique Stop Id for this station
   * @apiSuccess {String} items.stop_name  Station Name
   * @apiSuccess {Number} items.stop_lat Stop Latitude
   * @apiSuccess {Number} items.stop_lon Stop Longitude
   * @apiSuccess {String} items.stop_region Worker Region that a stop is in
   * @apiSuccess {Number} items.route_type See GTFS Route Types.
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     [
   *       {
   *         "stop_id": "WELL",
   *         "stop_name": "Wellington Station",
   *         "stop_lat": -41.278969,
   *         "stop_lon": 174.780562,
   *         "stop_region": "nz-wlg",
   *         "route_type": 2
   *       }
   *     ]
   *
   */
  async getStopsLatLon(req, res) {
    // no caching here, maybe we need it?
    const { logger, prefix, regionSpecific, _stopsFromDb } = this
    if (
      req.query.lat &&
      (req.query.lng || req.query.lon) &&
      req.query.distance
    ) {
      // limit of the distance value
      if (req.query.distance > 1250) {
        return res.status(400).send({
          error: 'too many stops sorry',
        })
      }

      const lat = parseFloat(req.query.lat)
      const lon = parseFloat(req.query.lng || req.query.lon)
      const dist = req.query.distance

      // the database is the default source
      let sources = [_stopsFromDb(lat, lon, dist)]
      if (prefix === 'nz-wlg') {
        sources = sources.concat(regionSpecific.extraSources(lat, lon, dist))
      } else if (prefix === 'nz-akl') {
        sources = sources.concat(regionSpecific.extraSources(lat, lon, dist))
      }

      try {
        // merges all the arays of data together
        const data = await Promise.all(sources)
        const response = [].concat(...data)
        res.send(response)
        return response
      } catch (err) {
        logger.error({ err }, 'Could not get stops lat lng.')
        res.status(500).send(err)
        return err
      }
    } else {
      const error = {
        message: 'please send all required params (lat, lng, distance)',
      }
      res.status(400).send(error)
      return error
    }
  }

  async _stopsFromDb(lat, lon, distance) {
    const { connection, prefix, _stopsFilter } = this
    const latDist = distance / 100000
    const lonDist = distance / 65000

    const sqlRequest = connection.get().request()
    sqlRequest.input('stop_lat_gt', sql.Decimal(10, 6), lat - latDist)
    sqlRequest.input('stop_lat_lt', sql.Decimal(10, 6), lat + latDist)
    sqlRequest.input('stop_lon_gt', sql.Decimal(10, 6), lon - lonDist)
    sqlRequest.input('stop_lon_lt', sql.Decimal(10, 6), lon + lonDist)
    const result = await sqlRequest.query(
      `
      SELECT
        stop_code AS stop_id,
        stop_name,
        stop_lat,
        stop_lon
      FROM stops
      WHERE
        (location_type = 0 OR location_type IS NULL)
        AND stop_lat > @stop_lat_gt AND stop_lat < @stop_lat_lt
        AND stop_lon > @stop_lon_gt AND stop_lon < @stop_lon_lt`
    )

    const stops = _stopsFilter(
      result.recordset.map(item => {
        const newItem = JSON.parse(JSON.stringify(item))
        newItem.stop_region = prefix
        newItem.stop_lng = item.stop_lon // this is a dumb api choice in the past
        newItem.route_type = this.stopsRouteType[item.stop_id]
        if (typeof item.route_type === 'undefined') {
          newItem.route_type = 3
        }
        return newItem
      })
    )
    return stops
  }
}
module.exports = Search
