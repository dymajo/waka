var router = require('express').Router()
var station = require('./station')
var cache = require('./cache')
var realtime = require('./realtime')
var line = require('./line')
var email = require('./email')
var vehicle = require('./vehicle')
var search = require('./search')
var sitemap = require('./sitemap')

console.log('using AT API Key: ' + process.env.atApiKey)
console.log('using SendGrid API Key: '+ process.env.SENDGRID_API_KEY)

// check the cache initally, then every half hour
cache.check()
setInterval(cache.check, 1800000)

router.get('/sitemap.txt', sitemap.serve)
router.get('/station', station.stopInfo)
router.get('/station/search', search.getStopsLatLng)
router.get('/station/:station', station.stopInfo)
router.get('/station/:station/times', station.stopTimes)
router.get('/station/:station/times/:fast', station.stopTimes)
router.get('/station/:station/timetable/:route/:direction', station.timetable)

router.get('/lines', line.getLines)
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
router.post('/:prefix/realtime', realtime.getTripsEndpoint)
router.post('/:prefix/vehicle_location', realtime.getVehicleLocation)

module.exports = router