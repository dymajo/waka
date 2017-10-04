var router = require('express').Router()
const search = require('./stops/search')
const station = require('./stops/station')
var cache = require('./cache')
var line = require('./lines/index')
var email = require('./email')
var vehicle = require('./vehicle')
const realtime = new (require('./realtime/index.js'))
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
router.post('/realtime', realtime.stopInfo)
router.post('/vehicle_location', realtime.vehicleLocation)
router.post('/email', email.sendEmail)

// NEW API V2
router.get('/:prefix/station', station.stopInfo)
router.get('/:prefix/station/search', search.getStopsLatLng)
router.get('/:prefix/station/:station', station.stopInfo)
router.get('/:prefix/station/:station/times', station.stopTimes)
router.get('/:prefix/station/:station/times/:fast', station.stopTimes)
router.get('/:prefix/station/:station/timetable/:route/:direction', station.timetable)
router.post('/:prefix/realtime', realtime.stopInfo)
router.post('/:prefix/vehicle_location', realtime.vehicleLocation)

module.exports = router