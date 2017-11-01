const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../../server-common/logger.js')
var gtfsDownloadOptions = {
  url: 'https://api.transport.nsw.gov.au/v1/publictransport/timetables/complete/gtfs',
  headers: {
    'Authorization': process.env.nswApiKey
  }
}

const sydney = {
  zipLocation: path.join(__dirname, '../../cache/sydney.zip'),
  files: [
    { //tick
      name: 'agency.txt',
      table: 'agency',
      versioned: false,
    },
    {
      name: 'stops.txt',
      table: 'stops',
      versioned: false,
    },
    { //tick
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
    { //tick
      name: 'calendar.txt',
      table: 'calendar',
      versioned: false,
    },
    { //tick
      name: 'calendar_dates.txt',
      table: 'calendar_dates',
      versioned: false,
    },
  ],
  shapeFile: 'shapes.txt', //tick
  download: () => {
    return new Promise((resolve, reject) => {
      log('Downloading GTFS Data from TfNSW')
      log(process.env.nswApiKey)
      const newOpts = JSON.parse(JSON.stringify(gtfsDownloadOptions))
      const gtfsRequest = request(newOpts).pipe(fs.createWriteStream(sydney.zipLocation))
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  }
}
module.exports = sydney