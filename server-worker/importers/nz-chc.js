const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../../server-common/logger.js')

const christchurch = {
  zipLocation: path.join(__dirname, '../../cache/metro-christchurch.zip'),
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
      const url = 'http://metroinfo.co.nz/Documents/gtfs.zip'
      log('Downloading GTFS Data from Metro Christchurch')
      const gtfsRequest = request({ url: url }).pipe(
        fs.createWriteStream(christchurch.zipLocation)
      )
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  },
}
module.exports = christchurch
