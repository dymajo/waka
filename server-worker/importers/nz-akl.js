const fs = require('fs')
const request = require('request')
const path = require('path')
const log = require('../../server-common/logger.js')
const gtfsImport = require('../db/gtfs-import.js')

const current = {
  zipLocation: path.join(__dirname, '../../cache/at.zip'),
  files: [
    {
      name: 'agency.txt',
      table: 'agency',
      versioned: false,
    },
    {
      name: 'stops.txt',
      table: 'stops',
      versioned: true,
    },
    {
      name: 'routes.txt',
      table: 'routes',
      versioned: true,
    },
    {
      name: 'trips.txt',
      table: 'trips',
      versioned: true,
    },
    {
      name: 'stop_times.txt',
      table: 'stop_times',
      versioned: true,
    },
    {
      name: 'calendar.txt',
      table: 'calendar',
      versioned: true,
    },
    {
      name: 'calendar_dates.txt',
      table: 'calendar_dates',
      versioned: true,
    },
  ],
  shapeFile: 'shapes.txt'
}

class AucklandImporter {
  async start() {
    const importer = new gtfsImport()
    // await this.download()
    await importer.unzip(current.zipLocation)
    for (let file of current.files) {
      // const file = current.files[1]
      await importer.upload(current.zipLocation + 'unarchived', file, global.config.version, file.versioned)
    }
  }
  download() {
    return new Promise((resolve, reject) => {
      const url = 'https://atcdn.blob.core.windows.net/data/gtfs.zip'
      log('Downloading GTFS Data from AT')
      const gtfsRequest = request({url: url}).pipe(fs.createWriteStream(this.zipLocation))
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  }
}
module.exports = AucklandImporter