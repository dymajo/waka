var request = require('request')
var moment = require('moment-timezone')
var fs = require('fs')

var options = {
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
};

var cache = {
  get: function() {
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

    // now we build the hashtable things
    Promise.all(promises).then(cache.build)
  },
  build: function() {
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
            route_type: s.route_type
          }
        })
        resolve()
      })
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
        })
        fs.writeFile('cache/tripsLookup.json', JSON.stringify(trips))
      })
    })
  }
}
module.exports = cache