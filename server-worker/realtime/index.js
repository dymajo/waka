const cache = require('../cache')
const fs = require('fs')
const path = require('path')

class Realtime {
  constructor() {
    this.fn = null
    cache.preReady.push(() => {
      if (fs.existsSync(path.join(__dirname, './' + global.config.prefix + '.js'))) {
        this.fn = require('./' + global.config.prefix)
        
      }
    })
    this.stopInfo = this.stopInfo.bind(this)
    this.vehicleLocation = this.vehicleLocation.bind(this)
  }
  /**
  * @api {post} /:region/realtime Trip Updates
  * @apiName GetRealtime
  * @apiGroup Realtime
  * @apiDescription The in built API tester doesn't work for this endpoint! Look at the request example and try it out yourself.  
  * 
  * @apiParam {String} region Region of Worker
  * @apiParam {String} stop_id Stop_id for trips
  * @apiParam {Object} trips Trips with data you want
  * @apiParam {Object} trips.trip Trip Id you want
  * @apiParam {Number} trips.trip.departure_time_seconds Departure Time Seconds retrieved from static api
  * @apiParam {String} trips.trip.route_short_name Route Short Name retrieved from static api
  * @apiParamExample {json} Request-Example:
  * {
  *   "stop_id": 7058,
  *   "trips": {
  *     "14267044381-20171113160906_v60.12": {
  *       "departure_time_seconds": 82320,
  *       "route_short_name": "267"
  *     }
  *   }
  * 
  *
  * @apiSuccess {Object} trips Object of Requested Trips, blank if no data
  * @apiSuccess {Number} trips.stop_sequence What stop the vehicle is at
  * @apiSuccess {Number} trips.delay Delay behind timetabled time
  * @apiSuccess {Number} trips.timestamp Timestamp on the server
  * @apiSuccess {String} trips.v_id Vehicle Id
  * @apiSuccess {Bool} trips.double_decker Whether a vehicle is a double decker or not
  *
  * @apiSuccessExample Success-Response:
  * HTTP/1.1 200 OK
  * {
  *   "14267065322-20171113160906_v60.12": {
  *     "stop_sequence": 18,
  *     "delay": 243,
  *     "timestamp": 1511432291.971,
  *     "v_id": "2C8D",
  *     "double_decker": false
  *   }
  * }
  */
  stopInfo(req, res) {
    if (!req.body.trips) {
      res.status(400).send({
        message: 'please send trips'
      })
      return
    }

    if (this.fn && typeof this.fn.getTripsEndpoint !== 'undefined') {
      this.fn.getTripsEndpoint(req, res)
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  }

  /**
  * @api {post} /:region/vehicle_location Vehicle Location
  * @apiName GetRealtimeLocation
  * @apiGroup Realtime
  * @apiDescription The in built API tester doesn't work for this endpoint! Look at the request example and try it out yourself.  
  * 
  * @apiParam {String} region Region of Worker
  * @apiParam {Object[String]} trips Array of trips that you want
  * @apiParamExample {json} Request-Example:
  * {
  *   "trips": [
  *     "14267044381-20171113160906_v60.12"
  *   ]
  * }
  *
  * @apiSuccess {Object} trips Object of Requested Trips, blank if no data
  * @apiSuccess {Number} trips.latitude Latitude of Vehicle
  * @apiSuccess {Number} trips.latitude longitude of Vehicle
  * @apiSuccess {Number} trips.bearing Bearing of Vehicle, in Degrees
  *
  * @apiSuccessExample Success-Response:
  * HTTP/1.1 200 OK
  * {
  *   "14267065322-20171113160906_v60.12": {
  *     "latitude":  -36.851867,
  *     "longitude": 174.76415,
  *     "bearing": 197
  *   }
  * }
  */
  vehicleLocation(req, res) {
    if (this.fn) {
      this.fn.getVehicleLocationEndpoint(req, res)
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  },

  healthcheck(req, res) {
    if (this.fn) {
      let lastUpdate = null
      if (this.fn.lastUpdate !== undefined) {
        lastUpdate = this.fn.lastUpdate
      }
      res.send({lastUpdate: lastUpdate})
    } else {
      res.status(400).send({
        message: 'realtime not available'
      })
    }
  }
}
module.exports = Realtime
