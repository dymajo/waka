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
  'EAST': [['Britomart Train Station', 'Manukau Train Station']],
  'ONE': [['Britomart Train Station', 'Onehunga Train Station']],
  'STH': [['Britomart Train Station', 'Papakura Train Station']],
  'WEST': [['Britomart Train Station', 'Swanson Train Station']],
  'PUK': [['Papakura Train Station', 'Pukekohe Train Station']],

  // CITY
  'CTY': [['City Link', 'Wynyard Quarter', 'Greys Ave']],
  'INN': [['Inner Link Clockwise'],['Inner Link Anticlockwise']],

  // ISTHMUS
  'OUT': [['Outer Link Clockwise'],['Outer Link Anticlockwise']],
  '005': [['Britomart', 'Pt Chevalier', 'Westmere']],
  '007': [['Pt Chevalier', 'St Heliers', 'Hospital And Selwyn Village'], ['Pt Chevalier', 'St Heliers', 'Selwyn Village And Hospital']],
  '008': [['New Lynn', 'Otahuhu']],
  '009': [['New Lynn', 'Sylvia Park', 'Blockhouse Bay Shops']],
  '010': [['Wynyard Quarter', 'Onehunga', 'Unitec']],
  '011': [['St Lukes', 'Onehunga']],
  '020': [['Britomart', 'Westmere', 'Wellington St']],
  '030': [['City Centre', 'Pt Chevalier']],
  '209': [['City Centre', 'Titirangi', 'New North Rd And Green Bay (U)'], ['City Centre', 'Titirangi', 'Green Bay And New North Rd (U)']],
  '220': [['Midtown', 'St Lukes'], ['City Centre', 'St Lukes']],
  '221': [['Midtown', 'Rosebank Rd'], ['City Centre', 'Rosebank Rd']],
  '222': [['Midtown', 'Patiki Rd'], ['City Centre', 'Patiki Rd']],
  '223': [['Midtown', 'New Lynn'], ['City Centre', 'New Lynn']],
  '224': [['Midtown', 'Henderson', 'St Lukes And New Lynn'], ['City Centre', 'Henderson']],
  '233': [['Midtown', 'New Lynn', 'Sandringham Road and St Lukes'], ['City Centre', 'New Lynn', 'Sandringham Road and St Lukes']],
  '243': [['Midtown', 'New Lynn', 'Sandringham Road'], ['City Centre', 'New Lynn', 'Sandringham Rd']],
  '243X': [['Midtown', 'New Lynn Express', 'Owairaka'], ['City Centre Express', 'New Lynn', 'Owairaka']],
  '246': [['Midtown', 'Wesley']],
  '248': [['Midtown', 'Blockhouse Bay'], ['Midtown', 'Blockhouse Bay', 'Sandringham Rd']],
  '248X': [['Midtown', 'Blockhouse Bay Express', 'New Windsor'], ['Midtown Express', 'Blockhouse Bay', 'New Windsor']],
  '249': [['Midtown', 'New Lynn', 'Sandringham Rd and Blockhouse Bay'], ['City Centre', 'New Lynn', 'Blockhouse Bay and Sandringham R']],
  '255': [['Civic Centre', 'May Rd'], ['Civic Centre', 'May Rd', 'Flyover']],
  '258': [['Civic Centre', 'Blockhouse Bay'], ['Civic Centre', 'Blockhouse Bay', 'Flyover']],
  '258X': [['Civic Centre', 'Blockhouse Bay Express'], ['Civic Centre Express', 'Blockhouse Bay']],
  '267': [['Civic Centre', 'Lynfield'], ['Civic Centre', 'Lynfield', 'Flyover']],
  '267X': [['Civic Centre', 'Lynfield Express'], ['Civic Centre Express', 'Lynfield']],
  '274': [['Britomart', 'Three Kings']],
  '277': [['Britomart', 'Waikowhai']],
  '299': [['Civic Centre', 'Lynfield', 'Waikowhai'], ['City Centre', 'Lynfield', 'Waikowhai']],
  '302': [['Civic Centre', 'Onehunga'], ['City Centre', 'Onehunga']],
  '309': [['Civic / Queen St', 'Mangere Town Centre'], ['City Centre', 'Mangere Town Centre']],
  '309X': [['Civic / Queen St', 'Mangere Town Centre (Express)'], ['City Centre (Express)', 'Mangere Town Centre']],
  '31X': [['City Centre', 'Onehunga Express', 'One Tree Hill'], ['City Centre Express', 'Onehunga', 'One Tree Hill']],
  '312': [['Civic Centre', 'Onehunga', 'Oranga'], ['City Centre', 'Onehunga', 'Oranga']],
  '321': [['Britomart', 'Middlemore Station', 'Greenlane']],
  '322': [['Britomart', 'Otahuhu Station', 'Great South Road']],
  '390': [['City Centre', 'Te Papapa']],

  // NORTH OF MOTORWAY ISTHMUS
  '605': [['Civic Centre', 'Lucerne Rd', 'Benson Rd'], ['City Centre', 'Lucerne Rd', 'Benson Rd']],
  '606': [['Civic Centre', 'Upland Rd', 'Lucerne Rd And Benson Rd']],
  '625': [['Britomart', 'Glen Innes', 'Khyber Pass Rd And Remuera Rd'], ['Britomart', 'Glen Innes', 'St Johns And Khyber Pass Rd']],
  '635': [['Britomart', 'Glen Innes', 'Parnell And Grand Dr'], ['Britomart', 'Glen Innes', 'Grand Dr And Parnell']],
  '645': [['Britomart', 'Glen Innes', 'Parnell and Remuera Rd']],
  '655': [['Britomart', 'Glen Innes', 'Meadowbank and Parnell']],
  '703': [['Britomart', 'Remuera', 'Portland Rd']],
  '715': [['Britomart', 'Glen Innes Centre', 'Orakei']],
  '719': [['Britomart', 'Sylvia Park']],
  '745': [['Britomart', 'Glen Innes Centre', 'Mission Bay']],
  '756': [['Britomart', 'Panmure', 'Mission Bay And Glen Innes'], ['Britomart', 'Panmure', 'Glen Innes And Mission Bay']],
  '757': [['Britomart', 'Otahuhu', 'Glen Innes And Mission Heights'], ['Britomart', 'Otahuhu', 'Panmure and Glen Innes and Mission']],
  '767': [['Britomart', 'Glendowie'], ['Britomart', 'Glendowie South', 'Tamaki Dr']],
  '769': [['Britomart', 'Glendowie North', 'Tamaki Dr']],
  '770': [['Newmarket', 'St Heliers', 'Kohimarama']],
  '771': [['Newmarket', 'St Heliers', 'Mission Bay']],

  // EAST
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