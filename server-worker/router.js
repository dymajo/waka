const log = require('../server-common/logger.js')
const router = require('express').Router()
const request = require('request')

const importers = require('./importers/index.js')
const station = require('./stops/station.js')
const search = require('./stops/search.js')
const line = require('./lines/index.js')
const realtime = new (require('./realtime/index.js'))

const signature = function() {
  return {
    prefix: global.config.prefix,
    version: global.config.version,
  }
}
/**
 * @api {get} /:region/info Get worker info
 * @apiName GetInfo
 * @apiGroup Info
 *
 * @apiParam {String} region Region of Worker
 *
 * @apiSuccess {String} prefix Region Code.
 * @apiSuccess {String} version  Version of GTFS Schedule currently in use.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "prefix": "nz-akl",
 *       "version": "20171013114012_v59.18"
 *     }
 *
 */
router.get('/a/info', function(req, res) {
  res.send(signature())
})

router.get('/a/stations', search.all)
router.get('/a/station', station.stopInfo)
router.get('/a/station/search', search.getStopsLatLng)
router.get('/a/station/:station', station.stopInfo)
router.get('/a/station/:station/times', station.stopTimes)
router.get('/a/station/:station/times/:time', station.stopTimes)
router.get('/a/station/:station/times/:fast', station.stopTimes)
router.get('/a/station/:station/timetable/:route/:direction', station.timetable)
router.get('/a/lines', line.getLines)
router.get('/a/line/:line', line.getLine)
router.get('/a/stops/trip/:trip_id', line.getStopsFromTrip)
router.get('/a/stops/shape/:shape_id', line.getStopsFromShape)
router.get('/a/shape/:shape_id', line.getShape)
router.get('/a/shapejson/:shape_id', line.getShapeJSON)
router.post('/a/realtime', realtime.stopInfo)
router.post('/a/vehicle_location', realtime.vehicleLocation)

router.get('/internal/import/:mode', function(req, res) {
  res.send()

  const importer = new importers()
  const cb = () => {
    request({
      method: 'POST',
      uri: 'http://127.0.0.1:8001/import-complete',
      json: true,
      body: signature()
    })
  }
  if (req.params.mode === 'all') {
    log('Started Import of All')
    importer.start().then(cb)
  } else if (req.params.mode === 'db') {
    importer.db().then(cb)
  } else if (req.params.mode === 'shapes') {
    importer.shapes().then(cb)
  } else if (req.params.mode === 'unzip') {
    importer.unzip().then(cb)
  } else if (req.params.mode === 'download') {
    importer.download().then(cb)
  }
})

module.exports = router