const cache = require('../cache')
const sql = require('mssql')
const connection = require('../db/connection.js')
const wlg = require('./nz-wlg.js')

var search = {
  _stopsFilter(recordset, mode) {
    const prefix = global.config.prefix
    if (prefix === 'nz-wlg') {
      return wlg.filter(recordset, mode)
    }
    return recordset
  },

  // This gets cached on launch
  stopsRouteType: {},
  all: function(req, res) {
    search._allStops().then(data => {
      res.send(data)
    }).catch(err => {
      res.status(500).send(err)
    })
  },
  _allStops: function() {
    return new Promise(function(resolve, reject) {
      const sqlRequest = connection.get().request()
      sqlRequest.query(`
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
      `).then(result => {
        resolve({
          route_types: search.stopsRouteType,
          items: search._stopsFilter(result.recordset, 'delete')
        })
      }).catch(err => {
        return reject({
          error: err
        })
      })
    })
  },
  getStopsRouteType() {
    const sqlRequest = connection.get().request()
    sqlRequest.query(`
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
    ).then((result) => {
      const route_types = {}
      result.recordset.forEach((stop) => {
        route_types[stop.stop_id] = stop.route_type
      })
      search.stopsRouteType = route_types
    }).catch((err) => {
      console.error(err)
    })
  },
  getStopsLatLng(req, res) {
    // no caching here, maybe we need it?
    if (req.query.lat && (req.query.lng || req.query.lon) && req.query.distance) {
      // limit of the distance value
      if (req.query.distance > 1250) {
        return res.status(400).send({
          'error': 'too many stops sorry'
        })
      }

      let lat = parseFloat(req.query.lat)
      let lon = parseFloat(req.query.lng || req.query.lon)
      let latDist = req.query.distance / 100000
      let lonDist = req.query.distance / 65000

      const sqlRequest = connection.get().request()
      sqlRequest.input('stop_lat_gt', sql.Decimal(10,6), lat - latDist)
      sqlRequest.input('stop_lat_lt', sql.Decimal(10,6), lat + latDist)
      sqlRequest.input('stop_lon_gt', sql.Decimal(10,6), lon - lonDist)
      sqlRequest.input('stop_lon_lt', sql.Decimal(10,6), lon + lonDist)
      sqlRequest.query(`
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
      ).then((result) => {
        res.send(search._stopsFilter(result.recordset.map(item => {
          item.stop_region = global.config.prefix
          item.stop_lng = item.stop_lon // this is fucking dumb
          item.route_type = search.stopsRouteType[item.stop_id] || 3
          return item
        })))
      }).catch((err) => {
        res.status(500).send(err)
      })
    } else {
      res.status(400).send({
        'message': 'please send all required params (lat, lng, distance)'
      })
    }
  }
}
cache.ready.push(search.getStopsRouteType)
module.exports = search