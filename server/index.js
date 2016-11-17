var router = require('express').Router()
var station = require('./station')
var cache = require('./cache')
var realtime = require('./realtime')
var line = require('./line')
var email = require('./email')
var vehicle = require('./vehicle')

console.log('using AT API Key: ' + process.env.atApiKey)
console.log('using SendGrid API Key: '+ process.env.SENDGRID_API_KEY)

// check the cache initally, then every half hour
cache.check()
setInterval(cache.check, 1800000)

router.get('/station', station.stopInfo)
router.get('/station/search', station.getStopsLatLong)
router.get('/station/:station', station.stopInfo)
router.get('/station/:station/times', station.stopTimes)
router.get('/lines', line.getLines)
router.get('/line/:line', line.getLine)
router.get('/vehicle/:vehicle', vehicle.getVehicle)
router.get('/shape/:line', line.getShape)
router.post('/realtime', realtime.getTrips)
router.post('/email', email.sendEmail)


module.exports = router;
