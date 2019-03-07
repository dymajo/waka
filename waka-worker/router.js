const router = require('express').Router()
const cache = require('./cache.js')
const station = require('./stops/station.js')
const search = require('./stops/search.js')
const line = require('./lines/index.js')
const onzo = require('./stops/onzo.js')
const realtime = new (require('./realtime/index.js'))()
const cityMetadata = require('../cityMetadata.json')

let bounds = {}
cache.ready.push(async () => {
  bounds = await station.getBounds()
})

const signature = () => {
  const { prefix, version } = global.config
  let city = cityMetadata[prefix]
  // if the region has multiple cities
  if (!Object.prototype.hasOwnProperty.call(city, 'name')) {
    city = city[prefix]
  }
  return {
    prefix,
    version,
    bounds,
    name: cityMetadata[prefix].name,
    secondaryName: cityMetadata[prefix].secondaryName,
    longName: cityMetadata[prefix].longName,
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
 * @apiSuccess {String} name Name of the Region
 * @apiSuccess {String} secondaryName Extra Region Name (State, Country etc)
 * @apiSuccess {String} longName The name and secondary name combined.
 * @apiSuccess {Object} bounds latlon Bound of stop data in region.
 * @apiSuccess {Object} bounds.lat Latitude Bounds
 * @apiSuccess {Number} bounds.lat.min Latitude Minimum Bound
 * @apiSuccess {Number} bounds.lat.max Latitude Minimum Bound
 * @apiSuccess {Object} bounds.lon Longitude Bounds
 * @apiSuccess {Number} bounds.lon.min Longitude Minimum Bound
 * @apiSuccess {Number} bounds.lon.max Longitude Minimum Bound
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "prefix": "nz-akl",
 *       "version": "20180702170310_v67.28",
 *       "name": "Tāmaki Makaurau",
 *       "secondaryName": "Auckland",
 *       "longName": "Tāmaki Makaurau, Auckland",
 *       "bounds": {
 *         "lat": {
 *           "min": -37.39747,
 *           "max": -36.54297
 *         },
 *         "lon": {
 *           "min": 174.43058,
 *           "max": 175.09714
 *         }
 *       }
 *     }
 *
 */
router.get('/info', (req, res) => res.send(signature()))

router.get('/stations', search.all)
router.get('/station', station.stopInfo)
router.get('/station/search', search.getStopsLatLng)
router.get('/station/:station', station.stopInfo)
router.get('/station/:station/times', station.stopTimes)
router.get('/station/:station/times/:time', station.stopTimes)
router.get('/station/:station/times/:fast', station.stopTimes)
router.get('/station/:station/timetable/:route/:direction', station.timetable)
router.get(
  '/station/:station/timetable/:route/:direction/:offset',
  station.timetable
)
router.get('/lines', line.getLines)
router.get('/line/:line', line.getLine)
router.get('/stops/trip/:trip_id', line.getStopsFromTrip)
router.get('/stops/shape/:shape_id', line.getStopsFromShape)
router.get('/shapejson/:shape_id', line.getShapeJSON)
router.get('/onzo', onzo.getBikes)
router.get('/realtime-healthcheck', realtime.healthcheck)
router.get('/realtime/:line', realtime.vehicleLocationV2)
router.post('/realtime', realtime.stopInfo)
router.post('/vehicle_location', realtime.vehicleLocation)

module.exports = router
