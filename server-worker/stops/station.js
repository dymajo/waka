const moment = require('moment-timezone')
const line = require('../lines/index')
const sql = require('mssql')
const connection = require('../db/connection.js')
const akl = require('./nz-akl.js')
const wlg = require('./nz-wlg.js')
const cache = require('../cache.js')

let rtFn = function() {
  return {}
}
cache.preReady.push(() => {
  if (global.config.prefix === 'nz-akl') {
    rtFn = require('../realtime/nz-akl.js').getTripsCachedAuckland
  }
})

const getHeadsign = function(longname, direction) {
  const prefix = global.config.prefix
  if (prefix === 'nz-wlg') {
    let rawname = longname.split('(')
    if (rawname.length > 1) {
      rawname = rawname[1].replace(')', '')
    } else {
      rawname = longname
    }
    rawname = rawname.split(' - ')
    if (direction === 1) {
      rawname.reverse()
    }
    return rawname[0]
  }
  return longname.split('/')[0]
}

var station = {
  /**
   * @api {get} /:region/station/:stop_id Info - by stop_id
   * @apiName GetStation
   * @apiGroup Station
   * @apiDescription This returns data on a single station.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} stop_id Station Stop ID, find using All Stations or Stations by Location routes.
   *
   * @apiSuccess {String} stop_id  Unique Stop Id for this station
   * @apiSuccess {String} stop_name  Station Name
   * @apiSuccess {String} stop_desc Station Description, if any
   * @apiSuccess {String} stop_lat Station Latitude
   * @apiSuccess {String} stop_lon Station Longitude
   * @apiSuccess {String} zone_id Fare zone - See GTFS.
   * @apiSuccess {String} location_type If the station is a parent station or not - see GTFS.
   * @apiSuccess {String} parent_station Parent Station, if any
   * @apiSuccess {String} stop_timezone Timezone of station, usually null & assumed to be agency timezone.
   * @apiSuccess {String} wheelchair_boarding Wheelchair Boarding - see GTFS.
   * @apiSuccess {String} route_type GTFS Route Type from this Station
   * @apiSuccess {String} prefix Worker Region of station
   *
   * @apiSuccessExample Success-Response:
   *    HTTP/1.1 200 OK
   *    {
   *      "stop_id": "133",
   *      "stop_name": "Britomart Train Station",
   *      "stop_desc": null,
   *      "stop_lat": -36.84429,
   *      "stop_lon": 174.76848,
   *      "zone_id": "merged_20",
   *      "location_type": 0,
   *      "parent_station": null,
   *      "stop_timezone": null,
   *      "wheelchair_boarding": null,
   *      "route_type": 2,
   *      "prefix": "nz-akl"
   *    }
   *
   */
  stopInfo: function(req, res) {
    if (req.params.station) {
      station._stopInfo(req.params.station).then(function(data) {
        res.send(data)
      }).catch(function(err) {
        if (global.config.prefix === 'nz-akl') {
          akl.getSingle(req.params.station).then((data) => {
            res.send(data)
          }).catch(() => {
            res.status(404).send(err)
          })
          return
        }
        res.status(404).send(err)  
      })
    } else {
      res.status(404).send({
        'error': 'please specify a station'
      })
    }
  },
  _stopInfo: function(stop) {
    return new Promise(function(resolve, reject) {
      stop = stop.trim()

      // returns data
      let override = false
      if (global.config.prefix === 'nz-wlg' && wlg.badStops.indexOf(stop) > -1) {
        override = stop
        stop = stop + '1'
      }

      const sqlRequest = connection.get().request()
      sqlRequest.input('stop_id', sql.VarChar, stop)
      sqlRequest.query(`
        SELECT 
          stops.stop_code as stop_id, 
          stops.stop_name,
          stops.stop_desc,
          stops.stop_lat,
          stops.stop_lon,
          stops.zone_id,
          stops.location_type,
          stops.parent_station,
          stops.stop_timezone,
          stops.wheelchair_boarding,
          routes.route_type
        FROM
          stops
        LEFT JOIN
          stop_times
        ON stop_times.id = (
            SELECT TOP 1 id 
            FROM    stop_times
            WHERE 
            stop_times.stop_id = stops.stop_id
        )
        LEFT JOIN trips ON trips.trip_id = stop_times.trip_id
        LEFT JOIN routes on routes.route_id = trips.route_id
        WHERE
          stops.stop_code = @stop_id
      `).then((result) => {
        const data = result.recordset[0]
        data.prefix = global.config.prefix
        delete data.uid
        if (override) {
          data.stop_id = override
        }
        resolve(data)
      }).catch(err => {
        return reject({
          error: 'station not found'
        })
      })
    })
  },
  /**
   * @api {get} /:region/station/:stop_id/times/:time Stop Times - by stop_id
   * @apiName GetTimes
   * @apiGroup Station
   * @apiDescription Shows services at a particular station.
   *
   * @apiParam {String} region Region of Worker
   * @apiParam {String} stop_id Station Stop ID, find using All Stations or Stations by Location routes.
   * @apiParam {String} [time] Find services at a particular time, defaults to current time.
   *
   * @apiSuccess {String} provider The data source. Usually "sql-server"
   * @apiSuccess {Number} current_time  Server time, in seconds.
   * @apiSuccess {Object[]} trips List of all the trips for the station.
   * @apiSuccess {String} trips.trip_id GTFS trip_id
   * @apiSuccess {Number} trips.stop_sequence What stop of the line this station corresponds to.
   * @apiSuccess {String} trips.trip_headsign General direction of where the service is going - usually displayed on vehicle
   * @apiSuccess {String} trips.shape_id Shape_id of route
   * @apiSuccess {Number} trips.direction_id 0 for outbound, 1 for inbound.
   * @apiSuccess {Date} trips.start_date When this trip is valid from - server filters out invalid ones automatically
   * @apiSuccess {Date} trips.end_date When this trip is valid unti - server filters out invalid ones automatically
   * @apiSuccess {String} trips.route_short_name Short service name.
   * @apiSuccess {String} trips.route_long_name Long service name - usually origin & destination. Sometimes "Eastern Line"
   * @apiSuccess {Number} trips.route_type GTFS Route Transport Type
   * @apiSuccess {String} trips.agency_id Agency that operates this service
   * @apiSuccess {String} trips.route_color Colour for the route
   * @apiSuccess {Number} trips.departure_time_seconds When the service is due to depart from this station, in seconds.
   * @apiSuccess {Object[]} realtime Realtime Info, only provided for some services. If empty, call the realtime API.
   *
   * @apiSuccessExample Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "provider": "sql-server",
   *       "currentTime": 45960,
   *       "trips": [
   *         {
   *           "trip_id": "50051071268-20171113160906_v60.12",
   *           "stop_sequence": 11,
   *           "trip_headsign": "Britomart",
   *           "shape_id": "1198-20171113160906_v60.12",
   *           "direction_id": 0,
   *           "start_date": "2017-11-16T00:00:00.000Z",
   *           "end_date": "2017-12-09T00:00:00.000Z",
   *           "route_short_name": "EAST",
   *           "route_long_name": "Manukau Train Station to Britomart Train Station",
   *           "route_type": 2,
   *           "agency_id": "AM",
   *           "route_color": "#f39c12",
   *           "departure_time_seconds": 44280
   *         },
   *       ],
   *       "realtime": {
   *         "50051071268-20171113160906_v60.12": {
   *           "stop_sequence": 41,
   *           "delay": -35,
   *           "timestamp": 1511222480.044,
   *           "v_id": "2CA9",
   *           "double_decker": false
   *         }
   *       }
   *     }
   */
  stopTimes: function(req, res) {
    // option in the future?
    // let fastData = false
    // if (req.params.fast === 'fast') {
    //   fastData = true
    // }
    if (!req.params.station) {
      return res.status(404).send({
        'error': 'please x specify a station'
      })
    }


    req.params.station = req.params.station.trim()
    
    if (global.config.prefix === 'nz-akl') {
      const data = akl.getTimes(req.params.station)
      if (data !== null) {
        return res.send(data)
      }
    }

    let sending = {
      provider: 'sql-server'
    }

    const time = moment().tz('Pacific/Auckland')
    let currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute()))
    let midnightOverride = false
    if (req.params.time) {
      const split = req.params.time.split(':')
      let tentativeDate = new Date(Date.UTC(1970,0,1,split[0],split[1]))
      if (tentativeDate.toString !== 'Invalid Date') {
        currentTime = tentativeDate
        midnightOverride = true
      }
    }
    sending.currentTime = currentTime.getTime()/1000

    const today = new Date(0)
    today.setFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date())

    // midnight fix
    if (time.hour() < 5 && midnightOverride === false) {
      today.setTime(today.getTime() - (1000 * 60 * 60 * 24))
    }

    // combines train stations platforms together
    let procedure = 'GetStopTimes'
    if (global.config.prefix === 'nz-wlg' && wlg.badStops.indexOf(req.params.station) > -1) {
      procedure = 'GetMultipleStopTimes'
    }

    const realtimeTrips = []
    connection.get().request()
      .input('stop_id', sql.VarChar(100), req.params.station)
      .input('departure_time', sql.Time, currentTime)
      .input('date', sql.Date, today)
      .execute(procedure)
      .then((trips) => {
        sending.trips = trips.recordset.map((record) => {
          record.departure_time_seconds = new Date(record.departure_time).getTime()/1000
          if (record.departure_time_24) {
            record.departure_time_seconds += 86400    
          }
          record.arrival_time_seconds = record.departure_time_seconds
          if (global.config.prefix === 'au-syd') {
            record.route_color = '#' + record.route_color // probably want to do this at db level #jonoshitfixbutbymatt
          }
          else {
            record.route_color = line.getColor(record.route_short_name)
          }
          // 30mins of realtime 
          if (record.departure_time_seconds < (sending.currentTime + 1800) || record.departure_time_24) {
            realtimeTrips.push(record.trip_id)
          }

          if (record.trip_headsign === null) {
            record.trip_headsign = getHeadsign(record.route_long_name, record.direction_id)
          }

          delete record.arrival_time
          delete record.arrival_time_24
          delete record.departure_time
          delete record.departure_time_24
          return record
        })

        sending.realtime = rtFn(realtimeTrips) 
        res.send(sending)
        
      }).catch(function(err) {
        console.log(err)
        res.status(500).send(err)
        
      })
  },
  /**
  * @api {get} /:region/station/:stop_id/timetable/:route/:direction/:offset Timetable - by stop_id
  * @apiName GetTimetable
  * @apiGroup Station
  * @apiDescription Shows timetable for a particular service at a particular station.
  *
  * @apiParam {String} region Region of Worker
  * @apiParam {String} stop_id Station Stop ID, find using All Stations or Stations by Location routes.
  * @apiParam {String} route route_short_name to look up.
  * @apiParam {Number} direction 0 for inbound, 1 for outbound, 2 for both directions.
  * @apiParam {Number} [offset] The number of days from today to get the timetable for 
  *
  * @apiSuccess {Object[]} trips List of all the trips for the station - just in root array, no actual object
  * @apiSuccess {String} trips.trip_id GTFS trip_id
  * @apiSuccess {String} trips.service_id GTFS service_id
  * @apiSuccess {String} trips.shape_id GTFS shape_id
  * @apiSuccess {String} trips.trip_headsign General direction of where the service is going - usually displayed on vehicle
  * @apiSuccess {Number} trips.direction_id 0 for outbound, 1 for inbound.
  * @apiSuccess {Number} trips.stop_sequence What stop of the line this station corresponds to.
  * @apiSuccess {String} trips.route_id GTFS route_id
  * @apiSuccess {String} trips.route_long_name Long service name - usually origin & destination. Sometimes "Eastern Line"
  * @apiSuccess {String} trips.agency_id Agency that operates this service
  * @apiSuccess {Number} trips.departure_time_seconds When the service is due to depart from this station, in seconds.
  * @apiSuccess {String} trips.route_color Colour for the route
  * @apiSuccess {Number} trips.currentTime Server Time, in Seconds
  * @apiSuccess {Number} trips.date Date of Trip
  *
  * @apiSuccessExample Success-Response:
  *    HTTP/1.1 200 OK
  *    [
  *      {
  *        "trip_id": "50051071494-20171113160906_v60.12",
  *        "service_id": "50051071494-20171113160906_v60.12",
  *        "shape_id": "1198-20171113160906_v60.12",
  *        "trip_headsign": "Britomart",
  *        "direction_id": 0,
  *        "stop_sequence": 11,
  *        "route_id": "50151-20171113160906_v60.12",
  *        "route_long_name": "Manukau Train Station to Britomart Train Station",
  *        "agency_id": "AM",
  *        "departure_time_seconds": 20880,
  *        "route_color": "#f39c12",
  *        "currentTime": 47760,
  *        "date": "2017-12-08T00:00:00.000Z"
  *      }
  *    ]
  */
  timetable: function(req, res) {
    if (parseInt(req.params.direction) > 2 || parseInt(req.params.direction) < 0) {
      return res.status(400).send({error: 'Direction is not valid.'})
    }
    let offset = 0
    if (!isNaN(parseInt(req.params.offset))) {
      offset = parseInt(req.params.offset)
    }

    let sending = {}

    const time = moment().tz('Pacific/Auckland')
    const currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute()))

    const today = new Date(Date.UTC(1970,0,1,0,0))
    today.setFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date() + offset)

    // combines train stations platforms together
    let procedure = 'GetTimetable'
    if (global.config.prefix === 'nz-wlg' && wlg.badStops.indexOf(req.params.station) > -1) {
      procedure = 'GetMultipleTimetable'
    }

    connection.get().request()
      .input('stop_id', sql.VarChar(100), req.params.station)
      .input('route_short_name', sql.VarChar(50), req.params.route)
      .input('date', sql.Date, today)
      .input('direction', sql.Int, req.params.direction)
      .execute(procedure)
      .then((trips) => {
        sending.trips = trips.recordset.map((record) => {
          record.departure_time_seconds = new Date(record.departure_time || record.arrival_time).getTime()/1000
          if (record.departure_time_24 || record.arrival_time_24) {
            record.arrival_time_seconds += 86400
          }
          record.arrival_time_seconds = record.departure_time_seconds
          record.route_color = line.getColor(req.params.route)
          record.currentTime = currentTime.getTime()/1000
          record.date = today

          if (record.trip_headsign === null) {
            record.trip_headsign = getHeadsign(record.route_long_name, record.direction_id)
          }

          delete record.departure_time
          delete record.departure_time_24
          return record
        })
        res.send(sending.trips)
      }).catch(function(err) {
        res.status(500).send(err)
      })
  }
}
module.exports = station