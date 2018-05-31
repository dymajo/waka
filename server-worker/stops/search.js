const cache = require('../cache')
const sql = require('mssql')
const connection = require('../db/connection.js')
const akl = require('./nz-akl.js')
const wlg = require('./nz-wlg.js')
const onzo = require('./onzo')

const search = {
  _stopsFilter(recordset, mode) {
    const prefix = global.config.prefix
    if (prefix === 'nz-wlg') {
      return wlg.filter(recordset, mode)
    }
    return recordset
  },

  // This gets cached on launch
  stopsRouteType: {},

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
  all: function(req, res) {
    search
      ._allStops()
      .then(data => {
        res.send(data)
      })
      .catch(err => {
        res.status(500).send(err)
      })
  },
  _allStops: function() {
    return new Promise(function(resolve, reject) {
      const sqlRequest = connection.get().request()
      sqlRequest
        .query(
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
        .then(result => {
          resolve({
            route_types: search.stopsRouteType,
            items: search._stopsFilter(result.recordset, 'delete'),
          })
        })
        .catch(err => {
          return reject({
            error: err,
          })
        })
    })
  },
  getStopsRouteType() {
    const sqlRequest = connection.get().request()
    sqlRequest
      .query(
        `
      SELECT 
        stops.stop_code as stop_id, routes.route_type
      FROM
        stops
      INNER JOIN
        stop_times
      ON stop_times.id = (
          SELECT TOP 1 id 
          FROM    stop_times
          WHERE 
          stop_times.stop_id = stops.stop_id
      )
      INNER JOIN trips ON trips.trip_id = stop_times.trip_id
      INNER JOIN routes ON routes.route_id = trips.route_id
      WHERE
         route_type <> 3`
      )
      .then(result => {
        const route_types = {}
        result.recordset.forEach(stop => {
          route_types[stop.stop_id] = stop.route_type
        })
        search.stopsRouteType = route_types
      })
      .catch(err => {
        console.error(err)
      })
  },
  /**
   * @api {get} /:region/station/search List - by Location
   * @apiName GetStationSearch
   * @apiGroup Station
   * @apiDescription Supply a latitude and a longitude, and you'll get all the stops back in that area.
   *
   * @apiParam {String} region="auto" Region of Worker, can be set to "auto" to automatically determine worker.
   * @apiParam {String} lat Latitude. Example: -41.2790
   * @apiParam {String} lng Longitude. Example: 174.7806
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
  getStopsLatLng(req, res) {
    // no caching here, maybe we need it?
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
      const bikes = req.query.bikes || false
      const lat = parseFloat(req.query.lat)
      const lon = parseFloat(req.query.lng || req.query.lon)
      const dist = req.query.distance

      // the database is the default source
      let sources = [search._stopsFromDb(lat, lon, dist)]
      const prefix = global.config.prefix
      if (prefix === 'nz-wlg') {
        sources = sources.concat(wlg.extraSources(lat, lon, dist))
      } else if (prefix === 'nz-akl') {
        sources = sources.concat(akl.extraSources(lat, lon, dist))
        if (bikes == 'true') {
          sources = sources.concat(onzo.getBikes(lat, lon, dist))
        }
      }

      Promise.all(sources)
        .then(data => {
          // merges all the arays of data together
          res.send([].concat.apply([], data))
        })
        .catch(err => {
          res.status(500).send(err)
        })
    } else {
      res.status(400).send({
        message: 'please send all required params (lat, lng, distance)',
      })
    }
  },
  _stopsFromDb(lat, lon, distance) {
    return new Promise((resolve, reject) => {
      const latDist = distance / 100000
      const lonDist = distance / 65000

      const sqlRequest = connection.get().request()
      sqlRequest.input('stop_lat_gt', sql.Decimal(10, 6), lat - latDist)
      sqlRequest.input('stop_lat_lt', sql.Decimal(10, 6), lat + latDist)
      sqlRequest.input('stop_lon_gt', sql.Decimal(10, 6), lon - lonDist)
      sqlRequest.input('stop_lon_lt', sql.Decimal(10, 6), lon + lonDist)
      sqlRequest
        .query(
          `
        select 
          stop_code as stop_id,
          stop_name,
          stop_lat,
          stop_lon
        from stops
        where 
          (location_type = 0 OR location_type IS NULL)
          and stop_lat > @stop_lat_gt and stop_lat < @stop_lat_lt
          and stop_lon > @stop_lon_gt and stop_lon < @stop_lon_lt`
        )
        .then(result => {
          const stops = search._stopsFilter(
            result.recordset.map(item => {
              item.stop_region = global.config.prefix
              item.stop_lng = item.stop_lon // this is fucking dumb
              item.route_type = search.stopsRouteType[item.stop_id]
              if (typeof item.route_type === 'undefined') {
                item.route_type = 3
              }
              return item
            })
          )
          resolve(stops)
        })
        .catch(err => {
          reject(err)
        })
    })
  },
}
cache.ready.push(search.getStopsRouteType)
module.exports = search
