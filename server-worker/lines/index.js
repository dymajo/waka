const azure = require('azure-storage')
const colors = require('colors')
const sql = require('mssql')
const connection = require('../db/connection.js')

const search = require('../stops/search.js')
const cache = require('../cache.js')

let lineData = {}
cache.preReady.push(() => {
  lineData = require('./' + global.config.prefix)
})

var tableSvc = azure.createTableService()
var blobSvc = azure.createBlobService()

blobSvc.createContainerIfNotExists('shapewkb', function(error, result, response) {
  if (error) {
    throw error
  }
})

var line = {
  getColor: function(route_short_name) {
    if (global.config.prefix !== 'au-syd') {
      return lineData.lineColors[route_short_name] || '#000'     
    } 
  },
  getLines: function(req, res) {
    res.send(line._getLines())
  },
  _getLines: function() {
    return {
      friendlyNames: lineData.friendlyNames,
      colors: lineData.lineColors,
      groups: lineData.lineGroups,
      lines: lineData.allLines,
      operators: lineData.lineOperators,
    } 
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
    const sqlRequest = connection.get().request()
    sqlRequest.input('route_short_name', sql.VarChar(50), lineId)
    sqlRequest.query(`
      SELECT 
        routes.route_id,
        routes.agency_id,
        routes.route_short_name,
        routes.route_long_name,
        routes.route_type,
        trips.shape_id,
        trips.trip_headsign,
        trips.direction_id,
        count(trips.shape_id) as shape_score
      FROM routes
          LEFT JOIN trips on 
          trips.route_id = routes.route_id
      WHERE 
          routes.route_short_name = @route_short_name
      GROUP BY
        routes.route_id,
        routes.agency_id,
        routes.route_short_name,
        routes.route_long_name,
        routes.route_type,
        trips.shape_id,
        trips.trip_headsign,
        trips.direction_id
      ORDER BY
        shape_score desc`).then(result => {
      const versions = {}
      const results = []

      result.recordset.forEach(function(route) {
        // hacks to be compatabible with table storage
        Object.keys(route).forEach((item) => {
          route[item] = {'_': route[item]}
        })

        // checks to make it's the right route (the whole exception thing)
        if (line.exceptionCheck(route) === false){
          return
        }
        // make sure it's not already in the response
        if (typeof(versions[route.route_long_name._ + (route.direction_id._ || '0')]) === 'undefined') {
          versions[route.route_long_name._ + (route.direction_id._ || '0')] = true
        } else {
          return
        }

        let result = {
          route_id: route.route_id._,
          route_long_name: route.route_long_name._,
          route_short_name: route.route_short_name._,
          route_color: line.getColor(route.route_short_name._),
          direction_id: route.direction_id._,
          shape_id: route.shape_id._,
          route_type: route.route_type._  
        }
        // if it's the best match, inserts at the front
        if (line.exceptionCheck(route, true) === true) {
          return results.unshift(result)
        }
        results.push(result)
      })
      if (results.length === 2) {
        if (results[0].route_long_name === results[1].route_long_name) {
          let candidate = results[1]
          if (results[0].direction_id !== 1) {
            candidate = results[0]
          }
          let regexed = candidate.route_long_name.match(/\((.+?)\)/g)
          if (regexed) {
            const newName = '('+regexed[0].slice(1, -1).split(' - ').reverse().join(' - ')+')'
            candidate.route_long_name = candidate.route_long_name.replace(/\((.+?)\)/g, newName)
          } else {
            candidate.route_long_name = candidate.route_long_name.split(' - ').reverse().join(' - ')
          }
        }
      }
      cb(null, results)
    }).catch(err => {
      cb(err, null)
    })
  },

  getShape: function(req, res) {
    let shape_id = req.params.shape_id
    tableSvc.retrieveEntity('meta', 'shapewkb', shape_id, function(err, result, response) {
      if (err) {
        res.status(404).send()
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
  getShapeJSON: function(req, res) {
    const prefix = global.config.prefix
    const version = global.config.version
    const containerName = encodeURIComponent((prefix+'-'+version).replace('_','-').replace('.','-'))
    const shape_id = req.params.shape_id
    const fileName = encodeURIComponent(new Buffer(shape_id).toString('base64') + '.json')
    blobSvc.getBlobToStream(containerName, fileName, res, function(blobError) {
      if (blobError) {
        res.status(404)
      }
      res.end()
      return
    })
  },

  exceptionCheck: function(route, bestMatchMode = false) {
    let allLines
    const prefix = global.config.prefix
    if (prefix === 'nz-akl' || prefix === 'nz-wlg') {
      allLines = lineData.allLines
    } else {
      return true
    }

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
    const sqlRequest = connection.get().request()
    sqlRequest.input('trip_id', sql.VarChar(100), req.params.trip_id)
    sqlRequest.query(`
      SELECT 
        stops.stop_code as stop_id,
        stops.stop_name,
        stops.stop_lat,
        stops.stop_lon,
        stop_times.departure_time,
        stop_times.departure_time_24,
        stop_times.stop_sequence
      FROM stop_times
      LEFT JOIN stops
        on stops.stop_id = stop_times.stop_id
      WHERE
        stop_times.trip_id = @trip_id
      ORDER BY stop_sequence`
    ).then((result) => {
      res.send(search._stopsFilter(result.recordset))
    }).catch((err) => {
      res.status(500).send(err)
    })
  },
  getStopsFromShape: function(req, res) {
    const sqlRequest = connection.get().request()
    sqlRequest.input('shape_id', sql.VarChar(100), req.params.shape_id)
    sqlRequest.query('SELECT TOP(1) trip_id FROM trips WHERE trips.shape_id = @shape_id').then((result) => {
      let trip_id = result.recordset[0].trip_id
      req.params.trip_id =  trip_id
      line.getStopsFromTrip(req, res)
    })
  }
}

module.exports = line