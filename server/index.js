var router = require('express').Router()
var station = require('./station')
var cache = require('./cache')

console.log('using AT api key: ' + process.env.atApiKey)
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

router.get('/station', station)
router.get('/station/:station', station)
module.exports = router;