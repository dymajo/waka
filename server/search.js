var azure = require('azure-storage')
var tableSvc = azure.createTableService()
var cache = require('./cache')
const fs = require('fs')
var sitemap = require('./sitemap')
const sql = require('mssql')
const connection = require('./db/connection.js')

var search = {
  getStopsLatLng(req, res) {
    // no caching here, maybe we need it?
    if (req.query.lat && req.query.lng && req.query.distance) {
      // limit of the distance value
      if (req.query.distance > 1250) {
        return res.status(400).send({
          'error': 'too many stops sorry'
        })
      }

      let lat = parseFloat(req.query.lat)
      let lng = parseFloat(req.query.lng)
      let latDist = req.query.distance / 100000
      let lngDist = req.query.distance / 65000

      const sqlRequest = connection.get().request()
      sqlRequest.input('prefix', sql.VarChar, req.params.prefix || 'nz-akl')
      sqlRequest.input('version', sql.VarChar, cache.currentVersion())
      sqlRequest.input('stop_lat_gt', sql.Decimal(10,6), lat - latDist)
      sqlRequest.input('stop_lat_lt', sql.Decimal(10,6), lat + latDist)
      sqlRequest.input('stop_lon_gt', sql.Decimal(10,6), lng - lngDist)
      sqlRequest.input('stop_lon_lt', sql.Decimal(10,6), lng + lngDist)
      sqlRequest.query(`
        select 
          stop_id,
          stop_name,
          stop_lat,
          stop_lon as stop_lng
        from stops
        where 
          prefix = @prefix 
          and version = @version
          and location_type = 0
          and stop_lat > @stop_lat_gt and stop_lat < @stop_lat_lt
          and stop_lon > @stop_lon_gt and stop_lon < @stop_lon_lt`
      ).then((result) => {
        res.send(result.recordset)
      }).catch((err) => {
        res.status(500).send(err)
      })
    } else {
      res.status(400).send({
        'message': 'please send all required params (lat, lng, distance)'
      })
    }
  },
  buildSitemap() {
    // we're going to do a directory listing instead of actually querying the database.
    // mainly because I put the db together badly, and it could have old shit info.
    // wheras the newest version of the cache should always be correct. I think.
    fs.readdir('cache/stops/' + cache.currentVersion(), function(err, files) {
      if (err) {
        return console.error(err)
      }
      files.forEach(function(file) {
        sitemap.push('/s/' + file.replace('.txt', ''))
      })
    })
  }
}
cache.ready.push(search.buildSitemap)
module.exports = search