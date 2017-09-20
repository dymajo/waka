const request = require('request')
const azure = require('azure-storage')
const cache = require('../cache')

const lineDataAkl = require('./nz-akl')
const lineDataWlg = require('./nz-wlg')
const allLines = lineDataAkl.allLines
const sql = require('mssql')
const connection = require('../db/connection.js')

const colors = require('colors')

var tableSvc = azure.createTableService()
var blobSvc = azure.createBlobService()

blobSvc.createContainerIfNotExists('shapewkb', function(error, result, response) {
  if (error) {
    throw error
  }
})

let lineOperators = {}

function cacheOperatorsAndShapes(prefix = 'nz-akl') {
  let todo = []
  for (var key in allLines) {
    todo.push(key)
  }

  let version = cache.currentVersion().split('_')[1]
  let getOperator = function(index) {
    if (index >= todo.length) {
      console.log('nz-akl:'.green, 'Completed Lookup of Agencies')
      return
    }
    // caches the operator
    const sqlRequest = connection.get().request()
    sqlRequest.input('prefix', sql.VarChar(50), prefix)
    sqlRequest.input('version', sql.VarChar(50), cache.currentVersion())
    sqlRequest.input('route_short_name', sql.VarChar(50), todo[index])
    sqlRequest.query(`
      SELECT top(1)
        agency_id
      FROM routes 
      where 
        prefix = @prefix and
        version = @version and
        route_short_name = @route_short_name
    `).then(result => {
      // query was successful
      if (result.recordset.length > 0) {
        const agency_id = result.recordset[0].agency_id
        lineDataAkl.lineColors[todo[index]] = lineDataAkl.colorFn(agency_id, todo[index])
        lineOperators[todo[index]] = agency_id
      } else {
        console.warn('could not find agency for', todo[index])
      }
      getOperator(index + 1)
    }).catch(err => console.warn(err))
  }
  getOperator(0)
}
// runs after initial cache get
cache.ready['nz-akl'].push(cacheOperatorsAndShapes)

var line = {
  getColor: function(agency = 'nz-akl', route_short_name) {
    if (agency === 'nz-wlg') {
      return lineDataWlg.lineColors[route_short_name] || '#000'
    }
    return lineDataAkl.lineColors[route_short_name] || '#000'
  },
  getLines: function(req, res) {
    res.send(line._getLines(req.params.prefix))
  },
  _getLines: function(prefix) {
    if (prefix === 'nz-wlg') {
      return {
        friendlyNames: lineDataWlg.friendlyNames,
        colors: lineDataWlg.lineColors,
        groups: lineDataWlg.lineGroups,
        lines: lineDataWlg.allLines,
        operators: lineDataWlg.lineOperators
      }
    }
    return {
      friendlyNames: lineDataAkl.friendlyNames,
      colors: lineDataAkl.lineColors,
      groups: lineDataAkl.lineGroups,
      lines: lineDataAkl.allLines,
      operators: lineOperators
    } 
  },
  getLine: function(req, res) {
    let lineId = req.params.line.trim()
    line._getLine(lineId, function(err, data) {
      if (err) {
        return res.status(500).send(err)
      }
      res.send(data)
    }, req.params.prefix)
  },
  _getLine(lineId, cb, prefix = 'nz-akl') {
    const sqlRequest = connection.get().request()
    sqlRequest.input('prefix', sql.VarChar(50), prefix)
    sqlRequest.input('version', sql.VarChar(50), cache.currentVersion(prefix))
    sqlRequest.input('route_short_name', sql.VarChar(50), lineId)
    sqlRequest.query(`
      SELECT 
        routes.route_id,
        routes.agency_id,
        routes.route_short_name,
        routes.route_long_name,
        routes.route_type,
        trips.shape_id,
        trips.trip_headsign
      FROM routes
      LEFT JOIN trips on 
        trips.prefix = routes.prefix and
        trips.version = routes.version and
        trips.route_id = routes.route_id
      WHERE 
        routes.prefix = @prefix and
        routes.version = @version and
        routes.route_short_name = @route_short_name`).then(result => {
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
        if (typeof(versions[route.route_long_name._]) === 'undefined') {
          versions[route.route_long_name._] = true
        } else {
          return
        }

        let result = {
          route_id: route.route_id._,
          route_long_name: route.route_long_name._,
          route_short_name: route.route_short_name._,
          route_color: line.getColor(prefix, route.route_short_name._),
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
    let prefix = req.params.prefix
    const containerName = encodeURIComponent((prefix+'-'+cache.currentVersion(prefix)).replace('_','-').replace('.','-'))
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
    const prefix = req.params.prefix || 'nz-akl'
    sqlRequest.input('prefix', sql.VarChar(50), prefix)
    sqlRequest.input('version', sql.VarChar(50), cache.currentVersion(prefix))
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
        on stops.stop_id = stop_times.stop_id and
        stops.prefix = stop_times.prefix and
        stops.version = stop_times.version
      WHERE
        stop_times.prefix = @prefix and
        stop_times.version = @version and
        stop_times.trip_id = @trip_id
      ORDER BY stop_sequence`
    ).then((result) => {
      res.send(result.recordset)
    }).catch((err) => {
      res.status(500).send(err)
    })
  },
  getStopsFromShape: function(req, res) {
    const sqlRequest = connection.get().request()
    const prefix = req.params.prefix || 'nz-akl'
    sqlRequest.input('prefix', sql.VarChar(50), prefix)
    sqlRequest.input('version', sql.VarChar(50), cache.currentVersion(prefix))
    sqlRequest.input('shape_id', sql.VarChar(100), req.params.shape_id)
    sqlRequest.query(`SELECT TOP(1) trip_id FROM trips WHERE trips.prefix = @prefix and trips.version = @version and trips.shape_id = @shape_id`).then((result) => {
      let trip_id = result.recordset[0].trip_id
      req.params.trip_id =  trip_id
      line.getStopsFromTrip(req, res)
    })
  }
}

module.exports = line