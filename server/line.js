var request = require('request')
var azure = require('azure-storage')
var wkx = require('wkx')
var cache = require('./cache')

var tableSvc = azure.createTableService()

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
    var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))
    newOpts.url += req.params.line
    request(newOpts, function(err, response, body){
      if (err) {
        res.send({
          error: err
        })
        return
      }
      res.send(JSON.parse(body).response[0].the_geom)
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
    var promises = [];
    var trip_id = req.params.trip_id
    var pkey = trip_id.split('_').slice(-1)[0]
    var azureResult
    var atResult = []
    promises.push(new Promise(function(resolve, reject) {
      tableSvc.retrieveEntity('trips', pkey, req.params.trip_id, function(err, result, response) {
        if (err) {
          return res.status(404).send({
            'error': 'trip not found'
          })
        }
        azureResult = result
        console.log(azureResult)
        resolve()
      })
    }))
    promises.push(new Promise(function(resolve, reject) {
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
        JSON.parse(body).response.forEach(function(item){
          atResult.push({
            stop_id: item.stop_id,
            stop_name: item.stop_name,
            stop_lat: item.stop_lat,
            stop_lon: item.stop_lon,         
          })
        })
        console.log(atResult)

        
        resolve()
      })  

    }))
    Promise.all(promises).then(function(){
      res.send({at: atResult, az: azureResult})
    })
  }
}

module.exports = line