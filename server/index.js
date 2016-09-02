var router = require('express').Router()
var station = require('./station')
var cache = require('./cache')
var map = require('./map')
var realtime = require('./realtime')

console.log('using AT API Key: ' + process.env.atApiKey)
console.log('using Google Maps API Key: ' + process.env.mapsApiKey)

// check the cache initally, then every hour
cache.check()
setInterval(cache.check, 3600000)

router.get('/map/:map', map.getMap)
router.get('/station', station.stopInfo)
router.get('/station/search', station.getStopsLatLong)
router.get('/station/:station', station.stopInfo)
router.get('/station/:station/times', station.stopTimes)
router.post('/realtime', realtime.getTrips)

module.exports = router;
