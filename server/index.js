var router = require('express').Router()
var station = require('./station')
var cache = require('./cache')
var realtime = require('./realtime')
var line = require('./lines/index')
var email = require('./email')
var vehicle = require('./vehicle')
var search = require('./search')
const colors = require('colors')

if (typeof process.env.SENDGRID_API_KEY === 'undefined') {
  console.log('SendGrid API Key is undefined.'.red)
}

// check the cache initally, then every half hour
cache.check()
setInterval(cache.check, 1800000)

const redirect = (req, res) => {
  res.redirect('/a/nz-akl' + req.path)
}
router.get('/station', redirect)
router.get('/station/*', redirect)
router.get('/lines', redirect)

// TODO: 301 redirects
router.get('/line/:line', line.getLine)
router.get('/stops/trip/:trip_id', line.getStopsFromTrip)
router.get('/stops/shape/:shape_id', line.getStopsFromShape)
router.get('/shape/:shape_id', line.getShape)

router.get('/vehicle/:vehicle', vehicle.getVehicle)
router.post('/realtime', realtime.getTripsEndpoint)
router.post('/vehicle_location', realtime.getVehicleLocation)
router.post('/email', email.sendEmail)

// NEW API V2
router.get('/:prefix/station', station.stopInfo)
router.get('/:prefix/station/search', search.getStopsLatLng)
router.get('/:prefix/station/:station', station.stopInfo)
router.get('/:prefix/station/:station/times', station.stopTimes)
router.get('/:prefix/station/:station/times/:fast', station.stopTimes)
router.get('/:prefix/station/:station/timetable/:route/:direction', station.timetable)
router.get('/:prefix/lines', line.getLines)
router.get('/:prefix/line/:line', line.getLine)
router.get('/:prefix/stops/trip/:trip_id', line.getStopsFromTrip)
router.get('/:prefix/stops/shape/:shape_id', line.getStopsFromShape)
router.get('/:prefix/shape/:shape_id', line.getShape)
router.get('/:prefix/shapejson/:shape_id', line.getShapeJSON)
router.post('/:prefix/realtime', realtime.getTripsEndpoint)
router.post('/:prefix/realtimebypass', realtime.endpointBypass)
router.post('/:prefix/vehicle_location', realtime.getVehicleLocation)

module.exports = router