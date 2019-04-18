const path = require('path')
const request = require('request')
const fs = require('fs')
const log = require('../../logger.js')
const config = require('../../config')

class BaseImporter {
  constructor() {
    this.files = [
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
    ]
    this.shapeFile = 'shapes.txt'
    this.zipLocation = path.join(__dirname, `../../cache/${this.zipname}.zip`)
    this.downloadOptions = { url: this.url }
  }

  download() {
    return new Promise((resolve, reject) => {
      log(config.prefix.magenta, 'Downloading GTFS Data')
      const gtfsRequest = request(this.downloadOptions).pipe(
        fs.createWriteStream(this.zipLocation)
      )
      gtfsRequest.on('finish', () => {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  }
}

module.exports = BaseImporter
