const log = require('../server-common/logger.js')
const router = require('express').Router()
const request = require('request')

const importers = require('./importers/index.js')
const line = require('./lines/index.js')

const signature = function() {
  return {
    prefix: global.config.prefix,
    version: global.config.version,
  }
}
router.get('/a/info', function(req, res) {
  res.send(signature())
})

router.get('/a/lines', line.getLines)
router.get('/a/line/:line', line.getLine)
router.get('/a/stops/trip/:trip_id', line.getStopsFromTrip)
router.get('/a/stops/shape/:shape_id', line.getStopsFromShape)
router.get('/a/shape/:shape_id', line.getShape)
router.get('/a/shapejson/:shape_id', line.getShapeJSON)

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
  }
})

module.exports = router