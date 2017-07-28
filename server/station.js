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

// THE CALENDAR EXCEPTION CACHE //
// NOT THE GREATEST, BUT LESS EFFORT THAN USING A PROPER CACHE //
var exceptionCache = {
  updated: null,
  additions: [],
  deletions: [],
  jsonAdditions: {},
  existsToday: function(today, frequency, service) {
    // console.log(service, frequency)
    var version = service.split('-')[1]
    if (typeof(cache.versions[version]) === 'undefined') {
      return false
    }

    if (exceptionCache.deletions.indexOf(service) != -1) {
      return false
    }
    if (exceptionCache.additions.indexOf(service) != -1) {
      return true
    }
    if (parseInt(frequency[(today+6) % 7]) === 1) {
      return true
    }
    return false
  },
  refresh: function() {
    var time = moment().tz('Pacific/Auckland')
    var y = time.year()
    var m = time.month()
    var d = time.date()
    var today = moment(Date.UTC(y, m, d, 0, 0))
    // fix for late night services
    if (time.hour() < 5) { 
      today.day(today.day()-1)
    }
    if (exceptionCache.updated !== today.toISOString() || JSON.stringify(exceptionCache.jsonAdditions) === '{}') {
      var adding = []
      var deleting = []
      var dateQuery = function(query, continuationToken, callback) {
        tableSvc.queryEntities('calendardate', query, continuationToken, function(err, result, response) {
          if (err) {
            if (err.statusCode === 404) {
              return console.log('calendardate table does not exist! skipping...')
            }
            return console.log(err)
          }
          result.entries.forEach(function(item) {
            if (item.exception_type._ === '1') {
              adding.push(item.RowKey._) 
            } else if (item.exception_type._ === '2') {
              deleting.push(item.RowKey._)
            }
          })
          if (result.continuationToken) {
            dateQuery(query, result.continuationToken, callback)
          } else {
            callback()
          }
        })
      }
      dateQuery(new azure.TableQuery().where('PartitionKey eq ?', today.toISOString()), null, function(message) {
        exceptionCache.additions = adding
        exceptionCache.deletions = deleting
        exceptionCache.updated = today.toISOString()
      })
      fs.readFile('cache/calendardate-parsed.json', function(err, data) {
        if (err) {
          console.log('calendardate-parsed.json does not exist! not using any calendar exceptions!')
          exceptionCache.jsonAdditions = {}  
          return
        }
        exceptionCache.jsonAdditions = JSON.parse(data)
      })
    }
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
  stopTimes: function(req, res, force) {
    if (req.query.force) {
      force = true
    }
    let fastData = false
    if (req.params.fast === 'fast') {
      fastData = true
    }
    if (!req.params.station) {
      console.log(req.params.station)
      return res.status(404).send({
        'error': 'please x specify a station'
      })
    }

    process.nextTick(exceptionCache.refresh) // async
    req.params.station = req.params.station.trim()
    
    let sending = {}

    // ask for trips in real time
    new Promise(function(resolve, reject) {
      // we going to query the things
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

      sending.currentTime = currentTime

      const currentVersion = cache.currentVersion()
      const azCurrentVersion = currentVersion.split('_').join('-').split('.').join('-')
      const parser = csvparse({delimiter: ','})
      // allows us to use as a hash table sort of thingo
      let possibleTrips = {}

      // read through file, test exceptions
      parser.on('readable', function(){
        const record = parser.read()

        // console.log(record)
        if (record === null) {
          sending.provider = 'azure-blob' // just for debugging purposes
          sending.trips = Object.keys(possibleTrips).map(function(key) {
            return possibleTrips[key]
          })
          resolve()
          return
        }

        const arrivalTime = parseInt(record[0])
        const service_id = record[2] + '-' + currentVersion
        const frequency = record[3]

        let interval = 7200
        if (fastData === true) {
          interval = 10800
        }
        if (exceptionCache.existsToday(today.day(), frequency, service_id) &&
          arrivalTime < currentTime + interval &&
          arrivalTime > currentTime - 1200) {
          possibleTrips[record[1]+ '-' +  currentVersion] = {
            arrival_time_seconds: arrivalTime,
            trip_id: record[1]+ '-' +  currentVersion,
            service_id: service_id,
            frequency: record[3],
            stop_sequence: parseInt(record[4])
          }
        }
      })
      
      // we need this, because bug in azure library causes the callback to not fire
      // rip rip rip maybe i should contribute to the library?
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
      

    }).then(function() {
      sending.trips.sort(function(a, b) {
        return a.arrival_time_seconds - b.arrival_time_seconds
      })

      const tripsToKeepNo = 5
      // reduce to only 5 of each route to make faster
      if (fastData === true) {
        const tripsToKeep = {}
        const tripsToKeepStore = []
        sending.trips.forEach(function(trip) {
          const prefix = trip.trip_id.substring(0, 5) + trip.stop_sequence.toString()
          if (typeof(tripsToKeep[prefix]) === 'undefined') {
            tripsToKeep[prefix] = 1
            tripsToKeepStore.push(trip)
          } else if (tripsToKeep[prefix] <= tripsToKeepNo) {
            tripsToKeep[prefix]++
            tripsToKeepStore.push(trip)
          }
        })
        sending.trips = tripsToKeepStore
      }

      var tmpTripStore = {}
      var tripPartitionQueue = {}
      var tripQueryPromises = []
      var finalTripsArray = []

      var getTrip = function(queue, index, callback) {
        // finished
        if (index === queue.length) {
          return callback()
        }
        // skips over if it's outdated
        var versionKey = queue[index].trip_id.split('-').slice(-1)[0]
        if (typeof(cache.versions[versionKey]) === 'undefined') {
          deleteCount += 1
          return getTrip(queue, index+1, callback)
        }
        var partitionKey = queue[index].trip_id.split('_').slice(-1)[0]
        tableSvc.retrieveEntity('trips', partitionKey, queue[index].trip_id, function(error, trip, response) {
          if (error) {
            // ignore not found trips
            if (error.statusCode != 404) {
              // fail if needed, but still resolve
              console.warn(error)
            }
            return getTrip(queue, index+1, callback)
          }
            
          // TODO: Only push the ones that haven't already ended
          finalTripsArray.push({
            arrival_time_seconds: tmpTripStore[trip.RowKey._].a,
            stop_sequence: tmpTripStore[trip.RowKey._].s,
            trip_id: trip.RowKey._,
            route_long_name: trip.route_long_name._,
            agency_id: trip.agency_id._,
            direction_id: trip.direction_id._,
            end_date: trip.end_date._,
            frequency: trip.frequency._,
            shape_id: trip.shape_id._,
            route_short_name: trip.route_short_name._,
            route_type: trip.route_type._,
            start_date: trip.start_date._,
            trip_headsign: trip.trip_headsign._
          })

          // should have all gone well :)
          return getTrip(queue, index+1, callback)
        })
      }

      var maxLength = 5
      var partitionCount = 0
      tripPartitionQueue[0] = []

      // divides the trips into partitions
      for (var i=0; i<sending.trips.length; i++) {
        tmpTripStore[sending.trips[i].trip_id] = {a: sending.trips[i].arrival_time_seconds, s: sending.trips[i].stop_sequence}

        // adds partitioned thing to queue
        if (tripPartitionQueue[partitionCount].length > maxLength) {
          partitionCount++
          tripPartitionQueue[partitionCount] = []
        }
        tripPartitionQueue[partitionCount].push(sending.trips[i])  
        
      }

      for (var key in tripPartitionQueue) {
        tripQueryPromises.push(new Promise(function(resolve, reject) {
          try {
            getTrip(tripPartitionQueue[key], 0, function() {
              resolve()
            })
          } catch(err) {
            console.warn(err)
          }
        }))
      }

      Promise.all(tripQueryPromises).then(function() {
        sending.trips = finalTripsArray
        res.send(sending)

        // cache shapes
        line.cacheShapes(sending.trips)
      })

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
// on first run
exceptionCache.refresh()
module.exports = station