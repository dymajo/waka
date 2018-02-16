const colors = require('colors')
const sql = require('mssql')
const connection = require('../db/connection.js')
const Storage = require('../db/storage.js')

const search = require('../stops/search.js')
const cache = require('../cache.js')
const config = require('../../config.js')

let lineData = {}
cache.preReady.push(() => {
  lineData = require('./' + global.config.prefix)
})

const storageSvc = new Storage({
  backing: config.storageService,
  local: config.emulatedStorage
})

var line = {
  getColor: function(route_short_name) {
    if (global.config.prefix !== 'au-syd') {
      return lineData.lineColors[route_short_name] || '#000'     
    } 
  },
  /**
  * @api {get} /:region/lines List - All
  * @apiName GetLines
  * @apiGroup Lines
  * 
  * @apiParam {String} region Region of Worker
  * 
  * @apiSuccess {Object[]} friendlyNames Key value store of Route Short Names to more official names
  * @apiSuccess {Object[]} colors Key value store of Route Short Names to corresponding colors
  * @apiSuccess {Object[]} groups Grouping for all the lines into region.
  * @apiSuccess {String} groups.name Name of Group
  * @apiSuccess {String[]} groups.items Route Short Names that belong in the group
  * @apiSuccess {Object[]} lines List of all lines
  * @apiSuccess {String[]} lines.line Can have more than one item - depends on how many route variants.
  * For each variant: 0th Element - Origin (or full name if length 1), 1st Element - Destination. 2nd Element - Via.
  * 
  * @apiSuccessExample Success-Response:
  *     HTTP/1.1 200 OK
  *     {
  *       "friendlyNames": {
  *         "380": "Airporter"
  *       },
  *       "colors": {
  *         "380": "#2196F3"
  *       },
  *       "groups": [
  *         {
  *           "name": "Congestion Free Network",
  *           "items": [
  *             "380"
  *           ]
  *         }
  *       ],
  *       "lines": {
  *         "380": [
  *           [
  *             "Onehunga",
  *             "Manukau",
  *             "Airport"
  *           ],
  *           [
  *             "Howick",
  *             "Pukekohe",
  *             "Airport"
  *           ]
  *         ]
  *       }
  *     }
  * 
  */
  getLines: function(req, res) {
    res.send(line._getLines())
  },
  _getLines: function() {
    return {
      friendlyNames: lineData.friendlyNames,
      friendlyNumbers: lineData.friendlyNumbers || {},
      colors: lineData.lineColors,
      groups: lineData.lineGroups,
      lines: lineData.allLines,
      operators: lineData.lineOperators,
    } 
  },
  /**
  * @api {get} /:region/line/:line Info - by route_short_name
  * @apiName GetLine
  * @apiGroup Lines
  * 
  * @apiParam {String} region Region of Worker
  * @apiParam {String} line route_short_name of particular line
  *
  * @apiSuccess {Object[]} line All the variants for a particular line.
  * @apiSuccess {String} line.route_id GTFS route_id
  * @apiSuccess {String} line.route_long_name Long name for route variant
  * @apiSuccess {String} line.route_short_name Short name for route variant
  * @apiSuccess {String} line.route_color Color for route
  * @apiSuccess {Number} line.direction_id Direction of route
  * @apiSuccess {String} line.shape_id GTFS Shape_id
  * @apiSuccess {Number} line.route_type GTFS route_type - Transport mode
  *
  * @apiSuccessExample Success-Response:
  * HTTP/1.1 200 OK
  * [
  *   {
  *     "route_id": "50140-20171113160906_v60.12",
  *     "route_long_name": "Britomart Train Station to Manukau Train Station",
  *     "route_short_name": "EAST",
  *     "route_color": "#f39c12",
  *     "direction_id": 1,
  *     "shape_id": "1199-20171113160906_v60.12",
  *     "route_type": 2
  *   },
  *   {
  *     "route_id": "50151-20171113160906_v60.12",
  *     "route_long_name": "Manukau Train Station to Britomart Train Station",
  *     "route_short_name": "EAST",
  *     "route_color": "#f39c12",
  *     "direction_id": 0,
  *     "shape_id": "1198-20171113160906_v60.12",
  *     "route_type": 2
  *   }
  * ]
  */
  getLine: async function(req, res) {
    const lineId = req.params.line.trim()
    try {
      const data = await line._getLine(lineId)
      res.send(data)
    } catch(err) {
      res.status(500).send(err)
    }
  },
  _getLine: async function(lineId) {
    const sqlRequest = connection.get().request()
    
    // filter by agency if a filter exists
    let agency = ''
    if (lineData.agencyFilter) {
      const agencyId = lineData.agencyFilter(lineId)
      if (agencyId !== null) {
        lineId = lineId.replace(agencyId, '')
        agency = 'and routes.agency_id = @agency_id'
        sqlRequest.input('agency_id', sql.VarChar(50), agencyId)
      }
    }
    sqlRequest.input('route_short_name', sql.VarChar(50), lineId)

    const query = `
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
          ${agency}
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
        shape_score desc`

    const result = await sqlRequest.query(query)
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
    return results
  },
  /**
  * @api {get} /:region/shapejson/:shape_id Line Shape - by shape_id
  * @apiName GetShape
  * @apiGroup Lines
  * 
  * @apiParam {String} region Region of Worker
  * @apiParam {String} shape_id GTFS Shape_id for particular shape.
  *
  * @apiSuccess {String} type GeoJSON Shape Type
  * @apiSuccess {Object[]} coordinates GeoJSON Coordinates
  *
  * @apiSuccessExample Success-Response:
  * HTTP/1.1 200 OK
  * {
  *   "type": "LineString",
  *   "coordinates": [
  *     [
  *         174.76848,
  *         -36.84429
  *     ],
  *     [
  *         174.76863,
  *         -36.84438
  *     ]
  *   ]
  * }
  */
  getShapeJSON: function(req, res) {
    const prefix = global.config.prefix
    const version = global.config.version
    const containerName = encodeURIComponent((prefix+'-'+version).replace('_','-').replace('.','-'))
    const shape_id = req.params.shape_id
    const fileName = encodeURIComponent(new Buffer(shape_id).toString('base64') + '.json')
    storageSvc.downloadStream(containerName, fileName, res, function(blobError) {
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

  /**
  * @api {get} /:region/stops/trip/:trip_id Line Stops - by trip_id
  * @apiName GetStopsByTrip
  * @apiGroup Lines
  * 
  * @apiParam {String} region Region of Worker
  * @apiParam {String} trip_id GTFS trip_id for particular trip
  *
  * @apiSuccess {Object[]} stops Array of stops
  *
  * @apiSuccessExample Success-Response:
  * HTTP/1.1 200 OK
  * [
  *   {
  *     "stop_id": "9218",
  *     "stop_name": "Manukau Train Station",
  *     "stop_lat": -36.99388,
  *     "stop_lon": 174.8774,
  *     "departure_time": "1970-01-01T18:00:00.000Z",
  *     "departure_time_24": false,
  *     "stop_sequence": 1
  *   }
  * ]
  */
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
  /**
  * @api {get} /:region/stops/shape/:shape_id Line Stops - by shape_id
  * @apiName GetStopsByShape
  * @apiGroup Lines
  * 
  * @apiParam {String} region Region of Worker
  * @apiParam {String} shape_id GTFS shape_id for particular trip
  *
  * @apiSuccess {Object[]} stops Array of stops
  *
  * @apiSuccessExample Success-Response:
  * HTTP/1.1 200 OK
  * [
  *   {
  *     "stop_id": "9218",
  *     "stop_name": "Manukau Train Station",
  *     "stop_lat": -36.99388,
  *     "stop_lon": 174.8774,
  *     "departure_time": "1970-01-01T18:00:00.000Z",
  *     "departure_time_24": false,
  *     "stop_sequence": 1
  *   }
  * ]
  */
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