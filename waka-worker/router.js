const router = require('express').Router()
const line = require('./lines/index.js')

router.get('/lines', line.getLines)
router.get('/line/:line', line.getLine)
router.get('/stops/trip/:trip_id', line.getStopsFromTrip)
router.get('/stops/shape/:shape_id', line.getStopsFromShape)
router.get('/shapejson/:shape_id', line.getShapeJSON)

module.exports = router
