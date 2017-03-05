var azure = require('azure-storage');
var request = require('request')
var moment = require('moment-timezone')
var fs = require('fs')
var deepEqual = require('deep-equal')
const extract = require('extract-zip')
const csvparse = require('csv-parse')
const transform = require('stream-transform')

const Queue = require('./queue.js')

var tableSvc = azure.createTableService();
const zipLocation = 'cache/gtfs.zip'

var options = {
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

let firstRun = true

var cache = {
  // current AT versions
  versions: {},

  check: function(cb) {
    tableSvc.createTableIfNotExists('meta', function(error) {
      if (error) {
        console.log(error)
      }

      options.url = 'https://api.at.govt.nz/v2/gtfs/versions'
      request(options, function(err, response, body) {
        var data = JSON.parse(body)
        cache.versions = {}

        data.response.forEach(function(version) {
          cache.versions[version.version] = {startdate: version.startdate, enddate: version.enddate}
        })

        let runCb = function() {
          if (firstRun) {
            // run all the callbacks
            cache.ready.forEach(function(fn) {
              fn()
            })
            firstRun = false
          }
        }

        tableSvc.retrieveEntity('meta', 'all', 'cache-version', function(err, result, response) {
          if (result === null) {
            console.log('building the cache for the first time')
            cache.get()
              .then(cache.unzip)
              .then(cache.build)
              .then(function() {
                cache.upload(function() {
                  runCb()
                  cache.uploadTimes()
                })
              })
          // objects are not equal, so we need to do a cache rebuild
          } else if (!deepEqual(cache.versions, JSON.parse(result.version._))) {
            console.log('cache needs rebuild', '\nnew:', cache.versions, '\nold:', JSON.parse(result.version._))
            cache.get()
              .then(cache.unzip)
              .then(cache.build)
              .then(function() {
                cache.upload(function() {
                  runCb()
                  cache.uploadTimes()
                })
              })
          } else {
            console.log('cache does not need update at', new Date().toString())
            runCb()
          }
        })
      })
    })
  },

  ready: [],

  get: function() {
    return new Promise(function(resolve, reject) {
      options.url = 'https://atcdn.blob.core.windows.net/data/gtfs.zip'
      console.log('Downloading GTFS Data from AT')
      const gtfsRequest = request(options).pipe(fs.createWriteStream(zipLocation))
      gtfsRequest.on('finish', function() {
        console.log('Finished Downloading GTFS Data')
        resolve()
      })
    })
  },
  unzip: function() {
    return new Promise(function(resolve, reject) {
      console.log('Unzipping GTFS Data')
      extract(zipLocation, {dir: 'cache'}, function (err) {
        if (err) {
          return reject('Failed to Unzip!')
        }
        console.log('Unzip Success!')
        resolve()
      })
    })
  },
  build: function() {
    console.log('Transforming GTFS Data')
    var promises = []

    // calendar table
    var services = {}
    promises[0] = new Promise(function(resolve, reject) {
      const input = fs.createReadStream('cache/calendar.txt')
      const parser = csvparse({delimiter: ','})
      let headers = null
      parser.on('readable', function() {
        // builds the csv headers for easy access later
        if (headers === null) {
          headers = {}
          parser.read().forEach(function(item, index) {
            headers[item] = index
          })
          return
        }

        // assembles our CSV into JSON
        var record = parser.read()
        if (record) {
          services[record[headers['service_id']]] = {
            frequency: record[headers['monday']] +
                       record[headers['tuesday']] +
                       record[headers['wednesday']] +
                       record[headers['thursday']] + 
                       record[headers['friday']] +
                       record[headers['saturday']] +
                       record[headers['sunday']],
            start_date: moment(record[headers['start_date']], 'YYYYMMDD').toDate(),
            end_date: moment(record[headers['end_date']], 'YYYYMMDD').toDate()
          }
        } else {
          console.log('Transformed calendar')
          resolve()
        }
      })
      input.pipe(parser)
    })

    // build a routes hash table
    var routes = {}
    promises[1] = new Promise(function(resolve, reject) {
      const input = fs.createReadStream('cache/routes.txt')
      const parser = csvparse({delimiter: ','})
      let headers = null
      parser.on('readable', function() {
        // builds the csv headers for easy access later
        if (headers === null) {
          headers = {}
          parser.read().forEach(function(item, index) {
            headers[item] = index
          })
          return
        }

        // assembles our CSV into JSON
        var record = parser.read()
        if (record) {
          routes[record[headers['route_id']]] = {
            agency_id: record[headers['agency_id']],
            route_short_name: record[headers['route_short_name']],
            route_long_name: record[headers['route_long_name']],
            route_type: record[headers['route_type']],
            shape_id: null, // this is copied in later when the trips is being assembled
            trip_headsign: null,
          }
        } else {
          console.log('Transformed routes')
          resolve()
        }
      })
      input.pipe(parser)
    })
    const transformToJson = function(file) {
      return new Promise(function(resolve, reject) {
        const input = fs.createReadStream('cache/' + file + '.txt')
        const parser = csvparse({delimiter: ','})
        let parsed = []
        let headers = null
        parser.on('readable', function() {
          // builds the csv headers for easy access later
          if (headers === null) {
            headers = {}
            parser.read().forEach(function(item, index) {
              headers[item] = index
            })
            return
          }

          // assembles our CSV into JSON
          var record = parser.read()
          if (record) {
            let obj = {}
            Object.keys(headers).forEach(function(key) {
              obj[key] = record[headers[key]]
            })
            parsed.push(obj)
          } else {
            fs.writeFile('cache/' + file + '.json', JSON.stringify(parsed, null, 2))
            console.log('Transformed ' + file)
            resolve()
          }
        })
        input.pipe(parser)
      })
    }

    promises[2] = transformToJson('stops')
    promises[3] = transformToJson('calendar_dates')
    // can't do this, uses too much ram
    //promises[3] = transformToJson('stop_times')

    // this is used only for stop times rebuild, so doesn't get db'ed
    var calendar_dates = function() {
      var parsed = {}
      const input = fs.createReadStream('cache/calendar_dates.txt')
      const parser = csvparse({delimiter: ','})
      let headers = null
      parser.on('readable', function() {
        if (headers === null) {
          headers = {}
          parser.read().forEach(function(item, index) {
            headers[item] = index
          })
          return
        }
        var record = parser.read()
        if (record) {
          const service_id = record[headers['service_id']]
          if (typeof(parsed[service_id]) === 'undefined') {
            parsed[service_id] = [[],[],[],[],[],[],[]]
          }
          let date = moment(record[headers['date']], 'YYYYMMDD')
          parsed[service_id][date.isoWeekday() - 1].push(date.toDate())
        } else {
          console.log('Transformed calendar_dates parsed')
          fs.writeFile('cache/calendardate-parsed.json', JSON.stringify(parsed, null, 2))
        }
      })
      input.pipe(parser)
    }
    calendar_dates()    

    // build the awesome joined trips lookup table
    return new Promise(function(resolve, reject) {
      Promise.all(promises).then(function() {
        var trips = {}
        const input = fs.createReadStream('cache/trips.txt')
        const parser = csvparse({delimiter: ','})
        let headers = null
        parser.on('readable', function() {
          // builds the csv headers for easy access later
          if (headers === null) {
            headers = {}
            parser.read().forEach(function(item, index) {
              headers[item] = index
            })
            return
          }

          // assembles our CSV into JSON
          var record = parser.read()
          if (record) {
            const route_id = record[headers['route_id']]
            const service_id = record[headers['service_id']]
            trips[record[headers['trip_id']]] = {
              route_id: route_id,
              service_id: service_id,
              trip_headsign: record[headers['trip_headsign']],
              direction_id: record[headers['direction_id']],
              block_id: record[headers['block_id']],
              shape_id: record[headers['shape_id']],
              agency_id: routes[route_id].agency_id,
              route_short_name: routes[route_id].route_short_name,
              route_long_name: routes[route_id].route_long_name,
              route_type: routes[route_id].route_type,
              frequency: services[service_id].frequency,
              start_date: services[service_id].start_date,
              end_date: services[service_id].end_date,
            }
            // copy this data later
            routes[route_id].shape_id =  record[headers['shape_id']]
            routes[route_id].trip_headsign =  record[headers['trip_headsign']]
          } else {
            fs.writeFile('cache/routeShapes.json', JSON.stringify(routes, null, 2))
            fs.writeFile('cache/tripsLookup.json', JSON.stringify(trips, null, 2))
            console.log('Finished GTFS Transform')
            resolve()
          }
        })
        input.pipe(parser)
      })
    })
  },
  upload: function(cb) {
    var promises = []

    promises[0] = new Promise(function(resolve, reject) {
      tableSvc.createTableIfNotExists('stops', function(error, result, response){
        if(!error){
          resolve()
        }
      })
    })

    promises[1] = new Promise(function(resolve, reject) {
      tableSvc.createTableIfNotExists('trips', function(error, result, response){
        if(!error){
          resolve()
        }
      })
    })

    promises[2] = new Promise(function(resolve, reject) {
      tableSvc.createTableIfNotExists('calendardate', function(error, result, response){
        if(!error){
          resolve()
        }
      })
    })

    promises[3] = new Promise(function(resolve, reject) {
      tableSvc.createTableIfNotExists('routeShapes', function(error, result, response){
        if(!error){
          resolve()
        }
      })
    })

    Promise.all(promises).then(function(){
      fs.readFile('cache/routeShapes.json', function(err, data){
        if (err) throw err;
        var routeShapesData = JSON.parse(data)
        var batch = new azure.TableBatch()
        var arrayOfEntityArrays = {}
        var arrayOfEntityCounts = {}
        var count = 0
        for (var key in routeShapesData) {
          var pkey = key.split('_').slice(-1)[0]
          if (typeof(arrayOfEntityArrays[pkey]) === 'undefined') {
            arrayOfEntityArrays[pkey] = []
            arrayOfEntityCounts[pkey] = 0
          }
          var b = arrayOfEntityArrays[pkey]
          var c = arrayOfEntityCounts[pkey]

          b[c] = b[c] || new azure.TableBatch()
          if (b[c].operations.length > 99) {
            // have to update both the copy, and the pointer
            arrayOfEntityCounts[pkey]++
            c++ 
            // then we can create a new batch
            b[c] = b[c] || new azure.TableBatch()
          }
          b[c].insertOrReplaceEntity({
            PartitionKey: {'_': pkey},
            RowKey: {'_': key},
            agency_id: {'_': routeShapesData[key].agency_id},
            route_short_name: {'_': routeShapesData[key].route_short_name},
            route_long_name: {'_': routeShapesData[key].route_long_name},
            route_type:{'_': routeShapesData[key].route_type},
            shape_id: {'_': routeShapesData[key].shape_id},
            trip_headsign: {'_': routeShapesData[key].trip_headsign}
          })
        }
        var batchUpload = function(name, batch, n) {
          try {
            if (n < batch.length) {
              console.log(`uploading route shapes_${name} batch ${n+1}/${batch.length}`)
              tableSvc.executeBatch('routeShapes', batch[n], function (error, result, response) {
                if(!error) {
                  batchUpload(name, batch, n+1)
                } else {
                  if (error.code === 'ETIMEDOUT') {
                    console.log('ETIMEDOUT... retrying')
                    batchUpload(name, batch, n)
                  } else {
                    console.log(error)
                  }
                }
              })
            } else {
              // console.log('finished uploading route shapes')
            }
          } catch(err) {
            console.log(err)
          }
        }
        for (var key in arrayOfEntityArrays) {
          batchUpload(key, arrayOfEntityArrays[key], 0)
        }
      })
    })

    Promise.all(promises).then(function(){
      fs.readFile('cache/stops.json', function(err, data){
        if (err) throw err
        var stopsData = JSON.parse(data)
        var arrayOfEntityArrays = []
        var count = 0
        stopsData.forEach(function(stop){
          arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
          if (arrayOfEntityArrays[count].operations.length > 99){
            count++
            arrayOfEntityArrays[count] = arrayOfEntityArrays[count] || new azure.TableBatch()
          }
          arrayOfEntityArrays[count].insertOrReplaceEntity({
            PartitionKey: {'_': 'allstops'},
            RowKey: {'_': stop.stop_id.toString()},
            stop_name: {'_': stop.stop_name},
            stop_desc: {'_': stop.stop_desc},
            stop_lat: {'_': stop.stop_lat, '$':'Edm.Double'},
            stop_lon: {'_': stop.stop_lon, '$':'Edm.Double'},
            zone_id: {'_': stop.zone_id},
            stop_url: {'_': stop.stop_url},
            stop_code: {'_': stop.stop_code},
            stop_street: {'_': stop.stop_street},
            stop_city: {'_': stop.stop_city},
            stop_region: {'_': stop.stop_region},
            stop_postcode: {'_': stop.stop_postcode},
            stop_country: {'_': stop.stop_country},
            location_type : {'_': stop.location_type, '$':'Edm.Int32'},
            parent_station: {'_': stop.parent_station},
            stop_timezone: {'_': stop.stop_timezone},
            wheelchair_boarding: {'_': stop.wheelchair_boarding},
            direction: {'_': stop.direction},
            position: {'_': stop.position},
            the_geom: {'_': stop.the_geom}
          })
        })
        // console.log(arrayOfEntityArrays[0])
        // console.log(arrayOfEntityArrays.length)
        var batchUpload = function(n){
          if (n < arrayOfEntityArrays.length) {
            if ((n+1) % 10 === 0 || n+1 === arrayOfEntityArrays.length) {
              console.log(`uploading stops batch ${n+1}/${arrayOfEntityArrays.length}`)
            }
            tableSvc.executeBatch('stops', arrayOfEntityArrays[n], function(error, result, response){
              if(!error){ 
                batchUpload(n+1)
              } else {
                if (error.code === 'ETIMEDOUT') {
                  console.log('ETIMEDOUT... retrying')
                  batchUpload(n)
                } else {
                  console.log(error)
                }
              }
            });
          } else {
            console.log('finished uploading stops')
          }
        }
        batchUpload(0)
      })
    })

    Promise.all(promises).then(function() {
      fs.readFile('cache/tripsLookup.json', function(err, data) {
        if (err) throw err
        var tripsData = JSON.parse(data)
        
        var arrayOfEntityArrays = {}
        var arrayOfEntityCounts = {}

        for (var key in tripsData) {
          var pkey = key.split('_').slice(-1)[0]

          // makes sure it does not upload old trips
          var version = key.split('-').slice(-1)[0]
          if (typeof(cache.versions[version]) === 'undefined') {
            // this is literally the first time i've ever used continue in js
            // console.log(version, 'is  not ok')
            continue
          // } else {
          //   console.log(version, 'is ok')
          }

          if (typeof(arrayOfEntityArrays[pkey]) === 'undefined') {
            arrayOfEntityArrays[pkey] = []
            arrayOfEntityCounts[pkey] = 0
          }
          var b = arrayOfEntityArrays[pkey]
          var c = arrayOfEntityCounts[pkey]

          b[c] = b[c] || new azure.TableBatch()
          if (b[c].operations.length > 99) {
            // have to update both the copy, and the pointer
            arrayOfEntityCounts[pkey]++
            c++ 
            // then we can create a new batch
            b[c] = b[c] || new azure.TableBatch()
          }
          b[c].insertOrReplaceEntity({
            PartitionKey: {'_': pkey},
            RowKey: {'_': key},
            route_id: {'_': tripsData[key].route_id},
            service_id: {'_': tripsData[key].service_id},
            trip_headsign: {'_': tripsData[key].trip_headsign},
            direction_id: {'_': tripsData[key].direction_id},
            block_id: {'_': tripsData[key].block_id},
            shape_id: {'_': tripsData[key].shape_id},
            agency_id: {'_': tripsData[key].agency_id},
            route_short_name: {'_': tripsData[key].route_short_name},
            route_long_name: {'_': tripsData[key].route_long_name},
            route_type: {'_': tripsData[key].route_type},
            frequency: {'_': tripsData[key].frequency},
            start_date: {'_': tripsData[key].start_date}, // i would store these as dates, but we have to individually enumerate to delete anyway :/
            end_date: {'_': tripsData[key].end_date} // i would store these as dates, but we have to individually enumerate to delete anyway :/
          })
        }
        var batchUpload = function(name, batch, n) {
          try {
            if (n < batch.length) {
              if ((n+1) % 10 === 0 || n+1 === batch.length) {
                console.log(`uploading trips_${name} batch ${n+1}/${batch.length}`)  
              }
              tableSvc.executeBatch('trips', batch[n], function (error, result, response) {
                if(!error) {
                  batchUpload(name, batch, n+1)
                } else {
                  if (error.code === 'ETIMEDOUT') {
                    console.log('ETIMEDOUT... retrying')
                    batchUpload(name, batch, n)
                  } else {
                    console.log(error)
                  }
                }
              })
            } else {
              console.log('finished uploading trips')
              cb()

              var task = {
                PartitionKey: {'_':'all'},
                RowKey: {'_': 'last-updated'},
                date: {'_':new Date(), '$':'Edm.DateTime'}
              }
              tableSvc.insertOrReplaceEntity('meta', task, function (error, result, response) {
                if (error) {
                  console.log(error)
                }
                console.log('saved new meta date')
              })
              var version = {
                PartitionKey: {'_':'all'},
                RowKey: {'_': 'cache-version'},
                version: {'_': JSON.stringify(cache.versions)}
              }
              tableSvc.insertOrReplaceEntity('meta', version, function (error, result, response) {
                if (error) {
                  console.log(error)
                }
                console.log('saved new meta version')
              })
            }
          } catch(err) {
            console.log(err)
          }
        }
        for (var key in arrayOfEntityArrays) {
          batchUpload(key, arrayOfEntityArrays[key], 0)
        }
      })
    })

    Promise.all(promises).then(function() {
      fs.readFile('cache/calendar_dates.json', function(err, data) {
        if (err) throw err
        var calendarData = JSON.parse(data)

        var arrayOfEntityArrays = {}
        var arrayOfEntityCounts = {}

        calendarData.forEach(function(item) {
          var pkey = item.date
          if (typeof(arrayOfEntityArrays[pkey]) === 'undefined') {
            arrayOfEntityArrays[pkey] = []
            arrayOfEntityCounts[pkey] = 0
          }
          var b = arrayOfEntityArrays[pkey]
          var c = arrayOfEntityCounts[pkey]

          b[c] = b[c] || new azure.TableBatch()
          if (b[c].operations.length > 99) {
            // have to update both the copy, and the pointer
            arrayOfEntityCounts[pkey]++
            c++ 
            // then we can create a new batch
            b[c] = b[c] || new azure.TableBatch()
          }
          b[c].insertOrReplaceEntity({
            PartitionKey: {'_': pkey},
            RowKey: {'_': item.service_id},
            exception_type: {'_': item.exception_type}
          })
        })
        var batchUpload = function(name, batch, n) {
          try {
            if (n < batch.length) {
              if ((n+1) % 10 === 0 || n+1 === batch.length) {
                console.log(`uploading exceptions_${name} batch ${n+1}/${batch.length}`)
              }
              tableSvc.executeBatch('calendardate', batch[n], function (error, result, response) {
                if(!error) {
                  batchUpload(name, batch, n+1)
                } else {
                  if (error.code === 'ETIMEDOUT') {
                    console.log('ETIMEDOUT... retrying')
                    batchUpload(name, batch, n)
                  } else {
                    console.log(error)
                  }
                }
              })
            } else {
              // console.log('finished uploading exceptions')
            }
          } catch(err) {
            console.log(err)
          }
        }
        for (var key in arrayOfEntityArrays) {
          batchUpload(key, arrayOfEntityArrays[key], 0)
        }
      })
    })
  },
  uploadTimes: function() {
    console.log('uploading times')
    return new Promise(function(resolve, reject) {
      const tripsLookup = JSON.parse(fs.readFileSync('cache/tripsLookup.json'))
      const exceptionsLookup = JSON.parse(fs.readFileSync('cache/calendardate-parsed.json'))

      const input = fs.createReadStream('cache/stop_times.txt')
      const parser = csvparse({delimiter: ','})
      let headers = null

      let totalBatches = 1
      let batchStore = {}
      let batchSize = {}
      let batchPromise = {}
      let azureQueue = new Queue()

      const uploadBatches = function(partitionKey) {
        totalBatches++
        if (totalBatches % 50 === 0) {
          console.log('uploading batch', totalBatches)
        }
        batchPromise[partitionKey] = new Promise(function(resolve, reject) {
          tableSvc.executeBatch('stoptimes', batchStore[partitionKey], function (error, result) {
            if (error) {
              console.error(error)
              return reject()
            }

            // reset things
            delete batchStore[partitionKey]
            batchSize[partitionKey] = 0
            batchPromise[partitionKey] = null

            resolve()
          })
        })
      }

      const uploadBatchesQueue = function(item) {
        const length = azureQueue.getLength()
        if (length % 50 === 0 || (length < 100 && length % 10 === 0)) {
          console.log(length + ' batches remaining')
        }
        
        tableSvc.executeBatch('stoptimes', item[1], function (error, result) {
          if (error) {
            console.error(error)
            return
          }
          if (azureQueue.getLength() > 0) {
            uploadBatchesQueue(azureQueue.dequeue())  
          }
        })
      }

      const uploader = transform(function(record, callback) {
        if (headers === null) {
          headers = {}
          record.forEach(function(item, index) {
            headers[item] = index
          })
          return callback(null)
        }

        const stop_id = record[headers['stop_id']]
        const trip_id = record[headers['trip_id']]
        const trip = tripsLookup[trip_id]
        const arrival = record[headers['arrival_time']].split(':')
        const arrival_seconds = moment.utc()
          .set('year', 1970)
          .set('month', 0)
          .set('date', 1)
          .set('hour', arrival[0])
          .set('minute', arrival[1])
          .set('second', arrival[2])
          .unix()
        const payload = {
          PartitionKey: {'_': stop_id},
          RowKey: {'_': arrival_seconds + '-' + trip_id},
          trip_id: {'_': trip_id},
          arrival_time_seconds: {
            '_': arrival_seconds,
            '$': 'Edm.Int32'
          },
          stop_sequence: {'_': parseInt(record[headers['stop_sequence']]), '$': 'Edm.Int32'},
          start_date: {'_': trip.start_date},
          end_date: {'_': trip.end_date},
          monday: {'_': trip.frequency[0]},
          tuesday: {'_': trip.frequency[1]},
          wednesday: {'_': trip.frequency[2]},
          thursday: {'_': trip.frequency[3]},
          friday: {'_': trip.frequency[4]},
          saturday: {'_': trip.frequency[5]},
          sunday: {'_': trip.frequency[6]},
          exceptions: {'_': JSON.stringify(exceptionsLookup[trip.service_id] || [[],[],[],[],[],[],[]])}
        }

        if (typeof(batchStore[stop_id]) === 'undefined') {
          batchStore[stop_id] = new azure.TableBatch()
          batchSize[stop_id] = 0
        }
        if (batchSize[stop_id] === 99) {
          // stops it running
          batchSize[stop_id]++

          // run the upload
          uploadBatches(stop_id)
          batchPromise[stop_id].then(callback)

        } else if (batchSize[stop_id] > 99) {
          // waits till the upload is complete
          batchPromise[stop_id].then(callback)
        } else {
          batchSize[stop_id]++
          batchStore[stop_id].insertOrReplaceEntity(payload)
          callback(null)
        }
      }, {parallel: 10})

      parser.on('finish', function() {
        Object.keys(batchStore).forEach(function(key) {
          azureQueue.enqueue([key, batchStore[key]])
        })

        const threads = 10
        console.log('Using', threads, 'threads.', azureQueue.getLength(), 'items to be uploaded.')
        for (let i=0; i<threads; i++) {
          uploadBatchesQueue(azureQueue.dequeue())  
        }
      })

      input.pipe(parser).pipe(uploader)
    })
  }
}
module.exports = cache