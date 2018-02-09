const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../../server-common/logger.js')

const otago = {
  zipLocation: path.join(__dirname, '../../cache/otago.zip'),
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
      const url = 'https://www.orc.govt.nz/media/4405/gtfs_ota_20180129.zip'
      log('Downloading GTFS Data from ORC')
      const gtfsRequest = request({url: url}).pipe(fs.createWriteStream(otago.zipLocation))
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  }
}
module.exports = otago