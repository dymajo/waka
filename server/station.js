var fs = require('fs')
const csvparse = require('csv-parse')
var request = require('request')
var moment = require('moment-timezone')
var azure = require('azure-storage')
var cache = require('./cache')
var line = require('./line')

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
    if (parseInt(frequency[today]) === 1) {
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
  cacheCheck(stop) {
    tableSvc.retrieveEntity('meta', 'stoptimes', stop, function(err, result, response) {
      if (err) {
        if (err.statusCode === 404) {
          // this is mainly to upgrade the database to not break deprecation, so we set last updated to a day ago
          var date = new Date() 
          date.setDate(date.getDate() - 1);
          var task = {
            PartitionKey: {'_': 'stoptimes'},
            RowKey: {'_': stop.toString()},
            date: {'_': date, '$':'Edm.DateTime'}
          }
          tableSvc.insertOrReplaceEntity('meta', task, function (error, result, response) {
            if (error) {
              console.log(error)
            }
            console.log(`saved temp stoptimes date for ${stop}`)
          })
        } else {
          console.log(err)
        }
        return
      }
      if(new Date().getTime() - result.date._.getTime() > 86400000) {
        // if it was last updated a day ago, redo the caches
        // TODO: update this to versions api haha
        station.getTripsFromAt(stop).then(function() {
          station.clean(stop)
        })
      }
    })
  },
  getFastDataFromAt(stop, cb) {
    console.log(stop, ': Getting Fast Data From AT')
    var newOpts = JSON.parse(JSON.stringify(options))
    newOpts.url = 'https://api.at.govt.nz/v2/gtfs/stops/stopinfo/' + parseInt(stop)

    const httpRequest = function(resolve, reject) {
      request(newOpts, function(err, response, body) {
        if (err) {
          reject(err)
        }
        let filteredTrips = []
        try {
          filteredTrips = JSON.parse(body)
        } catch(err) {
          // retries
          console.error(err, body)
          return httpRequest(resolve, reject)
        }
        filteredTrips = filteredTrips.response.map(function(trip) {
          let depTimeSplit = trip.departure_time.split(':')
          let arrTime = parseInt(depTimeSplit[0]*3600) + parseInt(depTimeSplit[1]*60) + parseInt(depTimeSplit[2])
          return {
            trip_id: trip.trip_id,
            arrival_time_seconds: arrTime,
            stop_sequence: trip.stop_sequence
          }
        })
        resolve(filteredTrips)
      })
    }
    return new Promise(function(resolve, reject) {
      httpRequest(resolve, reject)
    })
  },
  stopInfo: function(req, res) {
    if (req.params.station) {
      let stop = req.params.station.trim()
      tableSvc.retrieveEntity('stops', 'allstops', stop, function(err, result, response) {
        if (err) {
          return res.status(404).send({
            'error': 'station not found'
          })
        }
        res.send({
          stop_name: result.stop_name._,
          stop_lat: result.stop_lat._,
          stop_lon: result.stop_lon._
        })
      })
    } else {
      res.status(404).send({
        'error': 'please specify a station'
      })
    }
  },
  stopTimes: function(req, res, force) {
    if (req.query.force) {
      force = true
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
      const today = moment.utc('00:01', 'HH:mm')

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

        if (exceptionCache.existsToday(today.day(), frequency, service_id) &&
          arrivalTime < currentTime + 7200 &&
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

  }
}
// on first run
exceptionCache.refresh()
module.exports = station