var azure = require('azure-storage')
var tableSvc = azure.createTableService()

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
        if (result.entries === null) {
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
  }
}
module.exports = search