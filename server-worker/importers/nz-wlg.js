const connection = require('../db/connection.js')
const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../../server-common/logger.js')

const wellington = {
  zipLocation: path.join(__dirname, '../../cache/metlink.zip'),
  files: [
    {
      name: 'agency.txt',
      table: 'agency',
      versioned: false,
    },
    {
      name: 'stops.txt',
      table: 'stops',
      versioned: false,
    },
    {
      name: 'routes.txt',
      table: 'routes',
      versioned: false,
    },
    {
      name: 'trips.txt',
      table: 'trips',
      versioned: false,
    },
    {
      name: 'stop_times.txt',
      table: 'stop_times',
      versioned: false,
    },
    {
      name: 'calendar.txt',
      table: 'calendar',
      versioned: false,
    },
    {
      name: 'calendar_dates.txt',
      table: 'calendar_dates',
      versioned: false,
    },
  ],
  shapeFile: 'shapes.txt',
  download: () => {
    return new Promise((resolve, reject) => {
      const url =
        'https://www.metlink.org.nz/assets/Google_Transit/google-transit.zip'
      log('Downloading GTFS Data from Metlink')
      const gtfsRequest = request({ url: url }).pipe(
        fs.createWriteStream(wellington.zipLocation)
      )
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  },
  postImport: async () => {
    const sqlRequest = connection.get().request()
    await sqlRequest.query(`
      UPDATE trips 
      SET trips.trip_headsign = stop_times.stop_headsign
      FROM trips JOIN stop_times ON trips.trip_id = stop_times.trip_id
      WHERE stop_sequence = 0 and trips.trip_headsign is null
    `)
    log(
      (global.config.prefix + ' ' + global.config.version).magenta,
      'Post Import: Completed Trip Headsign Override'
    )
  },
}
module.exports = wellington
