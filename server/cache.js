var azure = require('azure-storage');
var request = require('request')
var moment = require('moment-timezone')
var fs = require('fs')

var tableSvc = azure.createTableService();

var options = {
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
};

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
        //console.log(cache.versions)
      })

      // TODO: Update this to use the new versions API.
      tableSvc.retrieveEntity('meta', 'all', 'last-updated', function(err, result, response) {
        if (result === null) {
          console.log('building the cache for the first time')
          cache.get(function() {
            console.log('uploading the cache')
            cache.upload()
          })
        } else if (new Date().getTime() - result.date._.getTime() > 86400000*2) {
          console.log('going to update the cache')
          cache.get(function() {
            console.log('uploading the cache')
            cache.upload()
          })
        } else {
          console.log('cache does not need update at', new Date().toString())
        }
      })
    })
  },
  get: function(cb) {
    var promises = []

    // calendar
    options.url = 'https://api.at.govt.nz/v2/gtfs/calendar'
    var calendar = request(options).pipe(fs.createWriteStream('cache/calendar.json'))
    promises[0] = new Promise(function(resolve, reject) {
      calendar.on('finish', function() {
        resolve()
      })
    })
    
    // routes
    options.url = 'https://api.at.govt.nz/v2/gtfs/routes'
    var routes = request(options).pipe(fs.createWriteStream('cache/routes.json'))
    promises[1] = new Promise(function(resolve, reject) {
      routes.on('finish', function() {
        resolve()
      })
    })

    // trips
    options.url = 'https://api.at.govt.nz/v2/gtfs/trips'
    var trips = request(options).pipe(fs.createWriteStream('cache/trips.json'))
    promises[2] = new Promise(function(resolve, reject) {
      trips.on('finish', function() {
        resolve()
      })
    })

    // stops
    options.url = 'https://api.at.govt.nz/v2/gtfs/stops'
    var stops = request(options).pipe(fs.createWriteStream('cache/stops.json'))
    promises[3] = new Promise(function(resolve, reject) {
      stops.on('finish', function() {
        resolve()
      })
    })

    var getExceptions = function(resolve) {
      // calendar exceptions
      options.url = 'https://api.at.govt.nz/v2/gtfs/calendarDate'
      var dates = request(options).pipe(fs.createWriteStream('cache/calendardate.json'))
      dates.on('finish', function() {
        fs.readFile('cache/calendardate.json', function(err, data) {
          if (err) throw err;
          if (JSON.parse(data).response === null) {
            console.log('failed to get calendar dates, retrying')
            getExceptions(resolve)
          } else {
            console.log('got calendar dates!')
            resolve()
          }
        })
      })
    }
    
    promises[4] = new Promise(function(resolve, reject) {
      getExceptions(resolve)
    })

    // now we build the hashtable things
    Promise.all(promises).then(function() {
      cache.build(cb)
    })
  },
  build: function(cb) {
    var promises = []

    // build a calendar hashtable
    var services = {}
    promises[0] = new Promise(function(resolve, reject) {
      fs.readFile('cache/calendar.json', function(err, data) {
        if (err) throw err;
        JSON.parse(data).response.forEach(function(s) {
          services[s.service_id] = {
            frequency: s.monday.toString() + s.tuesday.toString() + s.wednesday.toString() + s.thursday.toString() + s.friday.toString() + s.saturday.toString() + s.sunday.toString(),
            start_date: s.start_date,
            end_date: s.end_date
          }
        })
        resolve()
      })
    })

    // build a routes hash table
    var routes = {}
    promises[1] = new Promise(function(resolve, reject) {
      fs.readFile('cache/routes.json', function(err, data) {
        if (err) throw err;
        JSON.parse(data).response.forEach(function(s) {
          routes[s.route_id] = {
            agency_id: s.agency_id,
            route_short_name: s.route_short_name,
            route_long_name: s.route_long_name,
            route_type: s.route_type,
            shape_id: null,
            trip_headsign: null
          }
        })
        resolve()
      })
    })

    // this is used only for stop times rebuild, so doesn't get db'ed
    var parsed = {}
    fs.readFile('cache/calendardate.json', function(err, data) {
      var data = JSON.parse(data)
      data.response.forEach(function(service) {
        if (service.exception_type == 1) {
          if (typeof(parsed[service.service_id]) === 'undefined') {
            parsed[service.service_id] = [[],[],[],[],[],[],[]]
          }
          parsed[service.service_id][moment.utc(service.date).isoWeekday() - 1].push(service.date)
        }
      })
      fs.writeFile('cache/calendardate-parsed.json', JSON.stringify(parsed))
    })

    

    // build the awesome joined trips lookup table
    Promise.all(promises).then(function() {
      var trips = {}
      fs.readFile('cache/trips.json', function(err, data) {
        if (err) throw err;
        JSON.parse(data).response.forEach(function(s) {
          trips[s.trip_id] = {
            route_id: s.route_id,
            service_id: s.service_id,
            trip_headsign: s.trip_headsign,
            direction_id: s.direction_id,
            block_id: s.block_id,
            shape_id: s.shape_id,
            agency_id: routes[s.route_id].agency_id,
            route_short_name: routes[s.route_id].route_short_name,
            route_long_name: routes[s.route_id].route_long_name,
            route_type: routes[s.route_id].route_type,
            frequency: services[s.service_id].frequency,
            start_date: services[s.service_id].start_date,
            end_date: services[s.service_id].end_date
          }
          routes[s.route_id].shape_id = s.shape_id
          routes[s.route_id].trip_headsign = s.trip_headsign
          
        })
        fs.writeFile('cache/routeShapes.json', JSON.stringify(routes))
        fs.writeFile('cache/tripsLookup.json', JSON.stringify(trips))
        if (cb) cb()
      })
    })
  },
  upload: function() {
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
              console.log('finished uploading route shapes')
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
        if (err) throw err;
        var stopsData = JSON.parse(data)
        var batch = new azure.TableBatch()
        var arrayOfEntityArrays = []
        var count = 0
        stopsData.response.forEach(function(stop){
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
            stop_lat: {'_': stop.stop_lat},
            stop_lon: {'_': stop.stop_lon},
            zone_id: {'_': stop.zone_id},
            stop_url: {'_': stop.stop_url},
            stop_code: {'_': stop.stop_code},
            stop_street: {'_': stop.stop_street},
            stop_city: {'_': stop.stop_city},
            stop_region: {'_': stop.stop_region},
            stop_postcode: {'_': stop.stop_postcode},
            stop_country: {'_': stop.stop_country},
            location_type : {'_': stop.location_type },
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
            console.log(`uploading stops batch ${n+1}/${arrayOfEntityArrays.length}`)
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
        if (err) throw err;
        var tripsData = JSON.parse(data)
        
        var arrayOfEntityArrays = {}
        var arrayOfEntityCounts = {}

        for (var key in tripsData) {
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
              console.log(`uploading trips_${name} batch ${n+1}/${batch.length}`)
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
      fs.readFile('cache/calendardate.json', function(err, data) {
        if (err) throw err;
        var calendarData = JSON.parse(data).response

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
              console.log(`uploading exceptions_${name} batch ${n+1}/${batch.length}`)
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
              console.log('finished uploading exceptions')
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
  }
}
module.exports = cache