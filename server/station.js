var fs = require('fs')
const csvparse = require('csv-parse')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')
var cache = require('./cache')
var line = require('./line')
const sql = require('mssql')
const connection = require('./db/connection.js')

var options = {
  url: 'https://api.at.govt.nz/v2/gtfs/stopTimes/stopId/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

var station = {
  stopInfo: function(req, res) {
    if (req.params.station) {
      station._stopInfo(req.params.station, req.params.prefix || 'nz-akl').then(function(data) {
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
  _stopInfo: function(stop, prefix) {
    return new Promise(function(resolve, reject) {
      stop = stop.trim()

      const sqlRequest = connection.get().request()
      sqlRequest.input('prefix', sql.VarChar, prefix)
      sqlRequest.input('version', sql.VarChar, cache.currentVersion())
      sqlRequest.input('stop_id', sql.VarChar, stop)
      sqlRequest.query(`select stop_name, stop_lat, stop_lon from stops where prefix = @prefix and version = @version and stop_id = @stop_id`).then((result) => {
        const data = result.recordset[0]
        resolve({
          stop_name: data.stop_name,
          stop_lat: data.stop_lat,
          stop_lon: data.stop_lon,
        })
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
      console.log(req.params.station)
      return res.status(404).send({
        'error': 'please x specify a station'
      })
    }

    req.params.station = req.params.station.trim()
    const prefix = req.params.prefix || 'nz-akl'
    
    let sending = {
      provider: 'sql-server'
    }

    const time = moment().tz('Pacific/Auckland')
    let currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute()))
    sending.currentTime = currentTime.getTime()/1000

    const today = new Date(0)
    today.setFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date())

    connection.get().request()
      .input('prefix', sql.VarChar(50), prefix)
      .input('version', sql.VarChar(50), cache.currentVersion())
      .input('stop_id', sql.VarChar(100), req.params.station)
      .input('departure_time', sql.Time, currentTime)
      .input('date', sql.Date, today)
      .execute('GetStopTimes')
      .then((trips) => {
        sending.trips = trips.recordset.map((record) => {
          record.arrival_time_seconds = new Date(record.arrival_time).getTime()/1000
          if (record.arrival_time_24) {
            record.arrival_time_seconds += 86400
          }
          delete record.arrival_time
          delete record.arrival_time_24
          return record
        })
        res.send(sending)

        line.cacheShapes(sending.trips)
      }).catch(function(err) {
        res.status(500).send(err)
      })
  },
  timetable: function(req, res) {
    if (parseInt(req.params.direction) > 2 || parseInt(req.params.direction) < 0) {
      return res.status(400).send({error: 'Direction is not valid.'})
    }
    let sending = {}
    const currentVersion = cache.currentVersion()
    const prefix = req.params.prefix || 'nz-akl'

    const time = moment().tz('Pacific/Auckland')

    const today = new Date(0)
    today.setFullYear(time.year())
    today.setUTCMonth(time.month())
    today.setUTCDate(time.date())

    connection.get().request()
      .input('prefix', sql.VarChar(50), prefix)
      .input('version', sql.VarChar(50), cache.currentVersion())
      .input('stop_id', sql.VarChar(100), req.params.station)
      .input('route_short_name', sql.VarChar(50), req.params.route)
      .input('date', sql.Date, today)
      .input('direction', sql.Int, req.params.direction)
      .execute('GetTimetable')
      .then((trips) => {
        sending.trips = trips.recordset.map((record) => {
          record.arrival_time_seconds = new Date(record.arrival_time).getTime()/1000
          if (record.arrival_time_24) {
            record.arrival_time_seconds += 86400
          }
          delete record.arrival_time
          delete record.arrival_time_24
          return record
        })
        res.send(sending.trips)
      }).catch(function(err) {
        res.status(500).send(err)
      })
  }
}
module.exports = station