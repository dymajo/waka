var request = require('request')
var azure = require('azure-storage')
var wkx = require('wkx')
var cache = require('./cache')
var sitemap = require('./sitemap')

const lineData = require('./lineData')
const lineGroups = lineData.lineGroups
const friendlyNames = lineData.friendlyNames
const allLines = lineData.allLines

var tableSvc = azure.createTableService()
var blobSvc = azure.createBlobService()

blobSvc.createContainerIfNotExists('shapewkb', function(error, result, response){
  if (error) {
    throw error
  }
})

var shapeWKBOptions = {
  url: 'https://api.at.govt.nz/v2/gtfs/shapes/geometry/',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}
let lineOperators = {}

function cacheOperatorsAndShapes() {
  let todo = []
  let shapeCount = 0
  let shapesToCache = []
  for (var key in allLines) {
    todo.push(key)
  }

  let version = cache.currentVersion().split('_')[1]
  let getOperator = function(index) {
    if (index >= todo.length) {
      console.log('Completed Lookup of Agencies')
      return
    }
    // caches the operator
    let query = new azure.TableQuery()
      .select(['agency_id'])
      .top(1)
      .where('PartitionKey eq ? and route_short_name eq ?', version, todo[index])

    tableSvc.queryEntities('trips', query, null, function(error, result) {
      if(error) {
        console.warn(error)
      }
      // query was successful
      if (result.entries.length > 0) {
        lineOperators[todo[index]] = result.entries[0].agency_id._  
        sitemap.push('/l/' + todo[index])
      } else {
        console.warn('could not find agency for', todo[index])
      }
      getOperator(index + 1)
    })

    // caches the shape 
    line._getLine(todo[index], function(err, data) {
      if (err) {
        console.warn(err)
      }
      shapeCount++
      if (typeof(data[0]) !== 'undefined') {
        shapesToCache.push({shape_id: data[0].shape_id})
      }
      if (todo.length === shapeCount) {
        console.log('Collected List of Shapes To Cache')
        line.cacheShapes(shapesToCache)
      }
    })
  }
  getOperator(0)
}
// runs after initial cache get
cache.ready.push(cacheOperatorsAndShapes)

var line = {
  _friendlyNames: friendlyNames,
  getLines: function(req, res) {
    res.send({
      friendlyNames: friendlyNames,
      groups: lineGroups,
      lines: allLines,
      operators: lineOperators
    })
  },

  getLine: function(req, res) {
    let lineId = req.params.line.trim()
    line._getLine(lineId, function(err, data) {
      if (err) {
        return res.status(500).send(err)
      }
      res.send(data)
    })
  },
  _getLine(lineId, cb) {
    let version = cache.currentVersion().split('_')[1]
    let query = new azure.TableQuery()
      .where('PartitionKey eq ? and route_short_name eq ?', version, lineId)
    tableSvc.queryEntities('routeShapes', query, null, function(err, result){
      if (err) {
        cb(err, null)
      }
      var versions = {}
      var results = []
      result.entries.forEach(function(route) {
        // checks to make it's the right route (the whole exception thing)
        if (line.exceptionCheck(route) === false){
          return
        }
        // make sure it's a current version of the geom
        if (typeof(cache.versions[route.RowKey._.split('-')[1]]) === 'undefined') {
          return
        }
        // make sure it's not already in the response
        if (typeof(versions[route.route_long_name._]) === 'undefined') {
          versions[route.route_long_name._] = true
        } else {
          return
        }

        let result = {
          route_id: route.RowKey._,
          route_long_name: route.route_long_name._,
          route_short_name: route.route_short_name._,
          shape_id: route.shape_id._,
          route_type: route.route_type._  
        }
        // if it's the best match, inserts at the front
        if (line.exceptionCheck(route, true) === true) {
          return results.unshift(result)
        }
        results.push(result)
      })
      cb(null, results)
    })
  },

  getShape: function(req, res) {
    let shape_id = req.params.shape_id
    tableSvc.retrieveEntity('meta', 'shapewkb', shape_id, function(err, result, response) {
      if (err) {
        line.getShapeFromAt([shape_id], function(wkb) {
          if (wkb.length < 1) {
            res.status(404).send({
              error: 'not found'
            })
          } else {
            res.send(wkb[0].the_geom)
          }
        })
        return
      }
     
      res.set('Content-Type', 'text/plain')
      blobSvc.getBlobToStream('shapewkb', shape_id, res, function(blobError, blobResult, blobResponse){
        if (blobError) {
          console.warn(blobError)
        }
        res.end()
        return
      })
    })
  },
  getShapeFromAt(arrayOfShapeId, cb) {
    if (arrayOfShapeId.length === 0) {
      return
    }

    var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))
    let shape_id = arrayOfShapeId[0]
    newOpts.url += shape_id
    request(newOpts, function(err, response, body) {
      if (err) {
        console.warn(err)
        console.log(`${shape_id} : Failed to get Shape`)
        return line.getShapeFromAt(arrayOfShapeId.slice(1), cb)
      }

      // if AT doesn't send back a shape
      let wkb = JSON.parse(body).response
      if (wkb.length < 1) {
        console.log(`${shape_id} : Shape not found!`)
        return nextItem()
      }

      let nextItem = function() {
        if (arrayOfShapeId.length === 1) {
          // only calls back the last shape, for immediate return
          if (cb) {
            cb(wkb)
          }
          return
        } else {
          return line.getShapeFromAt(arrayOfShapeId.slice(1), cb)
        }
      }

      blobSvc.createBlockBlobFromText('shapewkb', shape_id, wkb[0].the_geom, function(blobErr, blobResult, blobResponse) {
        if (blobErr) {
          console.warn(blobErr)
          return nextItem()
        }
        nextItem()

        // informs table storage that there is an item there
        var task = {
            PartitionKey: {'_': 'shapewkb'},
            RowKey: {'_': shape_id},
            date: {'_': new Date(), '$':'Edm.DateTime'}
          }
        tableSvc.insertOrReplaceEntity('meta', task, function (error) {
          if (error) {
            return console.warn(error)
          }
          console.log(`${shape_id} : Shape Saved from AT`)
        })
      })
    })  
  },

  exceptionCheck: function(route, bestMatchMode = false) {
    // blanket thing for no schools
    if (route.trip_headsign._ === 'Schools'){
      return false
    }
    if (typeof(allLines[route.route_short_name._]) === 'undefined') {
      return true
    }
    let retval = false
    let routes = allLines[route.route_short_name._].slice()

    // new mode that we only find the best match
    if (bestMatchMode) {
      routes = [routes[0]]
    }
    routes.forEach(function(variant) {
      if (variant.length === 1 && route.route_long_name._ === variant[0]) {
        retval = true
      // normal routes - from x to x
      } else if (variant.length === 2) {
        let splitName = route.route_long_name._.toLowerCase().split(' to ')
        if (variant[0].toLowerCase() == splitName[0] && variant[1].toLowerCase() == splitName[1]) {
          retval = true
        // reverses the order
        } else if (variant[1].toLowerCase() == splitName[0] && variant[0].toLowerCase() == splitName[1]  && !bestMatchMode) {
          retval = true
        }
      // handles via Flyover or whatever
      } else if (variant.length === 3) {
        let splitName = route.route_long_name._.toLowerCase().split(' to ')
        if (splitName.length > 1 && splitName[1].split(' via ')[1] === variant[2].toLowerCase()) {
          splitName[1] = splitName[1].split(' via ')[0]
          if (variant[0].toLowerCase() === splitName[0] && variant[1].toLowerCase() === splitName[1]) {
            retval = true
          // reverses the order
          } else if (variant[1].toLowerCase() === splitName[0] && variant[0].toLowerCase() === splitName[1] && !bestMatchMode) {
            retval = true
          }
        }
      }
    })
    return retval

  },

  getStopsFromTrip: function(req, res){
    var trip_id = req.params.trip_id
    // var pkey = trip_id.split('_').slice(-1)[0]
    var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))     
    newOpts.url = 'https://api.at.govt.nz/v2/gtfs/stops/tripId/' + trip_id
    request(newOpts, function(err, response, body){
      if (err) {
        console.log(err)
        res.status(500).send({
          error: err
        })
        return
      }
      res.send(JSON.parse(body).response.map(function(item){
        return {
          stop_id: item.stop_id,
          stop_name: item.stop_name,
          stop_lat: item.stop_lat,
          stop_lon: item.stop_lon,         
        }
      }))
    })  
  },
  getStopsFromShape: function(req, res) {
    let shape_id = req.params.shape_id
    let version = cache.currentVersion().split('_')[1]
    let query = new azure.TableQuery()
      .select('RowKey')
      .top(1)
      .where('PartitionKey eq ? and shape_id eq ?', version, shape_id)
    tableSvc.queryEntities('trips', query, null, function(err, result) {
      if (result.entries.length < 1) {
        return res.status(404).send({
          'error': 'shape not found'
        })
      }
      // pass it on to another controller with hacks
      let trip_id = result.entries[0].RowKey._
      req.params.trip_id =  trip_id
      line.getStopsFromTrip(req, res)
    })
  },

  cacheShapes: function(trips) {
    // makes a priority list
    let allShapes = {}
    trips.forEach(function(trip) {
      let shape = trip.shape_id
      if (shape in allShapes) {
        allShapes[shape] +=1
      } else {
        allShapes[shape] = 1
      }
    })
    // flattens to priority array
    let sorted = Object.keys(allShapes).sort(function(a, b) {
      return allShapes[b] - allShapes[a]
    }).map(function(sortedKey) {
      return sortedKey
    })
    let promises = []
    let requests = []
    sorted.forEach(function(shape) {
      promises.push(new Promise(function(resolve, reject) {
        tableSvc.retrieveEntity('meta', 'shapewkb', shape, function(err, result, response) {
          if (err) {
            requests.push(shape)
          }
          resolve()
        })
      }))
    })
    // after it sees if they exist, fire the cache
    Promise.all(promises).then(function() {
      line.getShapeFromAt(requests)
    })
  }
}

module.exports = line