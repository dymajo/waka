var request = require('request')
var azure = require('azure-storage')
var wkx = require('wkx')
var cache = require('./cache')

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

var allLines = {
  // TRAINS
  'STH': [['Britomart Train Station', 'Papakura Train Station']],
  'WEST': [['Britomart Train Station', 'Swanson Train Station']],

  // CITY
  'CTY': [['City Link', 'Wynyard Quarter', 'Greys Ave']],
  'INN': [['Inner Link Clockwise'],['Inner Link Anticlockwise']],

  // ISTHMUS
  'OUT': [['Outer Link Clockwise'],['Outer Link Anticlockwise']],
  '007': [['Pt Chevalier', 'St Heliers', 'Hospital And Selwyn Village'], ['Pt Chevalier', 'St Heliers', 'Selwyn Village And Hospital']],
  '233': [['Midtown', 'New Lynn', 'Sandringham Road and St Lukes']],
  '255': [['Civic Centre', 'May Rd'], ['Civic Centre', 'May Rd', 'Flyover']],
  '258': [['Civic Centre', 'Blockhouse Bay'], ['Civic Centre', 'Blockhouse Bay', 'Flyover']],
  '267': [['Civic Centre', 'Lynfield'], ['Civic Centre', 'Lynfield', 'Flyover']],
  '274': [['Britomart', 'Three Kings']],
  '277': [['Britomart', 'Waikowhai']],

  // SOUTH
  '500': [['Britomart', 'Mission Heights', 'Botany Town Centre']]
}

var line = {
  getLines: function(req, res) {
    res.send(allLines)
  },

  getLine: function(req, res) {
    var query = new azure.TableQuery()
      .where('route_short_name eq ?', req.params.line)
    tableSvc.queryEntities('routeShapes', query, null, function(err, result, response){
      if (err) {
        return reject(err)
      }
      var versions = {}
      var results = []
      result.entries.forEach(function(route){
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

        results.push({
          route_id: route.RowKey._,
          route_long_name: route.route_long_name._,
          route_short_name: route.route_short_name._,
          shape_id: route.shape_id._,
          route_type: route.route_type._  
        })
      })
      res.send(results)
    })
  },
  getShape: function(req, res) {
    let shape_id = req.params.line
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

  exceptionCheck: function(route){
    // blanket thing for no schools
    if (route.trip_headsign._ === "Schools"){
      return false
    }
    if (typeof(allLines[route.route_short_name._]) === 'undefined') {
      return true
    }
    var retval = false
    allLines[route.route_short_name._].forEach(function(variant) {
      if (variant.length === 1 && route.route_long_name._ === variant[0]) {
        retval = true
      // normal routes - from x to x
      } else if (variant.length === 2) {
        var splitName = route.route_long_name._.toLowerCase().split(' to ')
        if (variant[0].toLowerCase() == splitName[0] && variant[1].toLowerCase() == splitName[1]) {
          retval = true
        // reverses the order
        } else if (variant[1].toLowerCase() == splitName[0] && variant[0].toLowerCase() == splitName[1]) {
          retval = true
        }
      // handles via Flyover or whatever
      } else if (variant.length === 3) {
        var splitName = route.route_long_name._.toLowerCase().split(' to ')
        if (splitName[1].split(' via ')[1] === variant[2].toLowerCase()) {
          splitName[1] = splitName[1].split(' via ')[0]
          if (variant[0].toLowerCase() === splitName[0] && variant[1].toLowerCase() === splitName[1]) {
            retval = true
          // reverses the order
          } else if (variant[1].toLowerCase() === splitName[0] && variant[0].toLowerCase() === splitName[1]) {
            retval = true
          }
        }
      }
    })
    return retval

  },

  getShapeFromTrip: function(req, res){
    var trip_id = req.params.trip_id
    var pkey = trip_id.split('_').slice(-1)[0]
    var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))     
    newOpts.url = 'https://api.at.govt.nz/v2/gtfs/stops/tripId/' + trip_id
    request(newOpts, function(err, response, body){
      if (err) {
        console.log(err)
        res.send({
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