var azure = require('azure-storage')
var tableSvc = azure.createTableService()
var cache = require('./cache')
const fs = require('fs')
var sitemap = require('./sitemap')

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

      let query = new azure.TableQuery()
          .where('stop_lat > ? and stop_lat < ?', lat - latDist, lat + latDist)
          .and('stop_lon > ? and stop_lon < ?', lng -  lngDist, lng + lngDist)

      tableSvc.queryEntities('stops', query, null, function(err, result) {
        if (result === null || result.entries === null) {
          res.send([])
        }
        res.send(result.entries.filter(function(stop) {
          if (stop.location_type._ === 0) {
            return true
          }
          return false
        }).map(function(stop) {
          return {
            stop_id: stop.RowKey._,
            stop_name: stop.stop_name._,
            stop_lat: stop.stop_lat._,
            stop_lng: stop.stop_lon._
          }
        }))
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