const moment = require('moment-timezone')
const line = require('../lines/index')
const sql = require('mssql')
const connection = require('../db/connection.js')
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

var station = {
  stopInfo: function(req, res) {
    if (req.params.station) {
      station._stopInfo(req.params.station).then(function(data) {
        res.send(data)
      }).catch(function(err) {
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
  timetable: function(req, res) {
    if (parseInt(req.params.direction) > 2 || parseInt(req.params.direction) < 0) {
      return res.status(400).send({error: 'Direction is not valid.'})
    }
    let sending = {}

    const time = moment().tz('Pacific/Auckland')
    const currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute()))

    const today = new Date(0)
    today.setFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date())

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