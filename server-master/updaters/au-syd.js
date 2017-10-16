const extract = require('extract-zip')
const colors = require('colors')
const path = require('path')
const request = require('request')
const transform = require('stream-transform')
const fs = require('fs')
const csvparse = require('csv-parse')
const moment = require('moment-timezone')
const config = require('../../config.js')

const WorkerManager = require('../workerManager.js')
const zipLocation = path.join(__dirname, '../../cache/syd-meta.zip')
const log = require('../../server-common/logger.js')

class Sydney {
  start() {
    const pull = () => {
      log('au-syd'.magenta, 'Pulling TfNSW Data.')
      this.pull().then(() => {
        log('au-syd'.magenta, 'Pull complete. Next pull in 1 day.')
      })
    }

    log('au-syd'.magenta, 'Updater Started')
    log('au-syd'.magenta, `Next pull in ${config.firstpull} mins`)
    setTimeout(pull, 1000 * 60 * config.firstpull)
    setInterval(pull, 1000 * 60 * 60 * 24)
  }
  async pull() {
    await this.download()
    await this.unzip()
    const meta = await this.findMeta()
    const version = meta[0]

    // import version if it doesn't exist
    if (WorkerManager.get('au-sud', version) === null) {
      log('au-syd'.magenta, 'New Version:', version)
      await WorkerManager.add({
        prefix: 'au-syd', 
        version: version
      })
      const worker = await WorkerManager.start('au-syd', version)
      await worker.importLongPromise('all')
      await worker.stop()
    }
    // adjust the mapping to make sure we're connected to the right version
    await this.adjustMapping()
  }
  async adjustMapping() {
    const meta = await this.findMeta()
    const now = moment().tz('Pacific/Auckland')
    const start = moment(meta[1]).tz('Pacific/Auckland')
    const end = moment(meta[2]).tz('Pacific/Auckland')

    const currentWorker = WorkerManager.getWorker(WorkerManager.getMapping('au-syd'))
    let versionDiff = false
    if (currentWorker !== null) {
      versionDiff = currentWorker.config.version !== meta[0]
    }

    if (start < now && now < end && versionDiff) {
      log('au-syd'.magenta, 'Mapping valid! Activating mapping.')
      await WorkerManager.start('au-syd', meta[0])
      await WorkerManager.setMapping('au-syd', meta[0])
      if (currentWorker !== null) {
        log('au-syd'.magenta, 'Stopping old worker.')
        await currentWorker.stop()
      }
    } else if (!versionDiff) {
      log('au-syd'.magenta, 'Version has not changed.')
    } else {
      log('au-syd'.magenta, 'Will not activate new version yet.')
    }
  }

  // copied from the server-worker, but that's okay.
  download() {
    return new Promise((resolve, reject) => {
      const newOpts = JSON.parse(JSON.stringify(gtfsDownloadOptions))
      log('Downloading GTFS Data from TfNSW')
           
      const gtfsRequest = request(newOpts).pipe(fs.createWriteStream(sydney.zipLocation))
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  }
  unzip() {
    return new Promise((resolve, reject) => {
      extract(zipLocation, {dir: path.resolve(zipLocation + 'unarchived')}, function (err) {
        if (err) {
          return reject()
        }
        log('au-syd'.magenta, 'Unzipped TfNSW Metadata')
        resolve()
      })
    })
  }
  findMeta() {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(path.resolve(zipLocation + 'unarchived', 'feed_info.txt'))
      const parser = csvparse({delimiter: ','})

      let headers = null
      const transformer = transform((row, callback) => {
        if (!headers) {
          headers = row
          return callback()
        }
        resolve([row[headers.indexOf('feed_version')], row[headers.indexOf('feed_start_date')], row[headers.indexOf('feed_end_date')]])
        transformer.end()
      })
      transformer.on('error', reject)

      input.pipe(parser).pipe(transformer)
    })
  }
}
module.exports = Sydney