var router = require('express').Router()
var station = require('./station')
var cache = require('./cache')
var map = require('./map')

console.log('using AT API Key: ' + process.env.atApiKey)
console.log('using Google Maps API Key: ' + process.env.mapsApiKey)
router.get('/cache-get', function(req, res) {
  cache.get()
  res.send({
    'status': 'getting'
  })
})
router.get('/cache-build', function(req, res) {
  cache.build()
  res.send({
    'status': 'building'
  })
})
router.get('/cache-upload', function(req, res) {
  cache.upload()
  res.send({
    'status': 'building'
  })
})

router.get('/map/:map', map.getMap)
router.get('/station', station.stopInfo)
router.get('/station/:station', station.stopInfo)
router.get('/station/:station/times', station.stopTimes)

module.exports = router;

