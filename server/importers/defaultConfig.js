const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../logger.js')

const get = (zipname, downloadOptions) => {
  const zipLocation = path.join(__dirname, `../../cache/${zipname}.zip`)
  return {
    zipLocation,
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
    download: () =>
      new Promise((resolve, reject) => {
        log(global.config.prefix.magenta, 'Downloading GTFS Data')
        const gtfsRequest = request(downloadOptions).pipe(
          fs.createWriteStream(zipLocation)
        )
        gtfsRequest.on('finish', () => {
          log('Finished Downloading GTFS Data')
          resolve()
        })
        gtfsRequest.on('error', reject)
      }),
  }
}
module.exports = {
  get,
}
