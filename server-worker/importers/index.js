const fs = require('fs')
const request = require('request')
const log = require('../../server-common/logger.js')
const gtfsImport = require('../db/gtfs-import.js')

class Importer {
  async start() {
    const current = require('./' + global.config.prefix + '.js')
    const importer = new gtfsImport()
    // await this.download()
    await importer.unzip(current.zipLocation)
    for (let file of current.files) {
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
module.exports = Importer