const router = require('express').Router()
const cache = require('./cache.js')
const station = require('./stops/station.js')
const line = require('./lines/index.js')
const onzo = require('./stops/onzo.js')
const realtime = new (require('./realtime/index.js'))()

let bounds = {}
cache.ready.push(async () => {
  bounds = await station.getBounds()
})

router.get('/station', station.stopInfo)
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
router.post('/vehicle_location', realtime.vehicleLocation)

module.exports = router
