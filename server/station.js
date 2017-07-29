var fs = require('fs')
const csvparse = require('csv-parse')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')
var cache = require('./cache')
var line = require('./line')
const sql = require('mssql')
const connection = require('./db/connection.js')

var tableSvc = azure.createTableService()
var blobSvc = azure.createBlobService()
tableSvc.createTableIfNotExists('stoptimes', function(error, result, response) {
  if (error) throw error
})

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
      })
  },
  timetable: function(req, res) {
    if (parseInt(req.params.direction) > 2 || parseInt(req.params.direction) < 0) {
      return res.status(400).send({error: 'Direction is not valid.'})
    }
    const currentVersion = cache.currentVersion()
    let promises = []
    promises.push(new Promise(function(resolve, reject) {
      const azCurrentVersion = currentVersion.split('_').join('-').split('.').join('-')
      const parser = csvparse({delimiter: ','})

      const time = moment().tz('Pacific/Auckland')
      let currentTime = new Date(Date.UTC(1970,0,1,time.hour(),time.minute())).getTime()/1000
      var y = time.year()
      var m = time.month()
      var d = time.date()
      const today = moment(Date.UTC(y, m, d, 0, 1))

      // i hope at doesn't do 24 hour services soon 
      // but then again I do because we should be a world class city
      if (time.hour() < 5) {
        currentTime += 86400
        today.subtract(1, 'day')
      }
      
      let trips = []
      let tripsHashTable = {}

      // read through file, test exceptions
      parser.on('readable', function(){
        const record = parser.read()

        // console.log(record)
        if (record === null) {
          return resolve(trips)
        }

        const service_id = record[2] + '-' + currentVersion
        const frequency = record[3]
        if (exceptionCache.existsToday(today.day(), frequency, service_id) && typeof(tripsHashTable[record[2]]) === 'undefined') {
          trips.push(record)
          tripsHashTable[record[2]] = true
        }
      })

      blobSvc.getBlobProperties(azCurrentVersion, req.params.station + '.txt', function(error) {
        if (error) {
          if (error.statusCode === 404) {
            res.status(404).send({
              error: 'not found yo my yo'
            })  
          } else {
            res.status(500).send(error)
          }
          return reject()
        }
        blobSvc.createReadStream(azCurrentVersion, req.params.station + '.txt').pipe(parser)
      })
    }))
    promises.push(new Promise(function(resolve, reject) {
      const azCurrentVersion = currentVersion.split('_')[1]

      const query = new azure.TableQuery()
        .select(['RowKey','route_id','shape_id','trip_headsign','route_long_name','frequency','start_date','end_date','agency_id'])
        .where('PartitionKey eq ?', azCurrentVersion)
        .and('route_short_name eq ?', req.params.route)

      if (req.params.direction !== '2') {
        query.and('direction_id eq ?', req.params.direction)
      }

      tableSvc.queryEntities('trips', query, null, function(err, result, response) {
        const trips = {}
        result.entries.forEach(function(entry) {
          trips[entry.RowKey._] = {
            route_id: entry.route_id._,
            shape_id: entry.shape_id._,
            trip_headsign: entry.trip_headsign._,
            route_long_name: entry.route_long_name._,
            frequency: entry.frequency._,
            start_date: entry.start_date._,
            end_date: entry.end_date._,
            agency_id: entry.agency_id._,
          }
        })
        resolve(trips)
      })
    }))
    Promise.all(promises).then(function(data) {
      const result = []
      data[0].forEach(function(record) {
        // console.log(record)
        const trip_id = record[1] + '-' + currentVersion
        const obj = {
          arrival_time_seconds: parseInt(record[0]),
          trip_id: trip_id,
          service_id: record[2] + '-' + currentVersion,
          frequency: record[3],
          stop_sequence: parseInt(record[4])
        }
        if (trip_id in data[1]) {
          Object.assign(obj, data[1][trip_id])
          result.push(obj)
        }
      })
      res.send(result)
    }).catch(function(err) {
      res.send(err)
    })
  }
}
module.exports = station