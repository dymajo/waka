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
const zipLocation = path.join(__dirname, '../../cache/metlink-meta.zip')
const log = require('../../server-common/logger.js')

class Wellington {
  start() {
    const pull = () => {
      log('nz-wlg'.magenta, 'Pulling Metlink Data.')
      this.pull().then(() => {
        log('nz-wlg'.magenta, 'Pull complete. Next pull in 1 day.')
      })
    }

    log('nz-wlg'.magenta, 'Updater Started')
    log('nz-wlg'.magenta, `Next pull in ${config.firstpull} mins`)
    setTimeout(pull, 1000 * 60 * config.firstpull)
    setInterval(pull, 1000 * 60 * 60 * 24)
  }
  async pull() {
    await this.download()
    await this.unzip()
    const meta = await this.findMeta()
    const version = meta[0]

    // import version if it doesn't exist
    if (WorkerManager.get('nz-wlg', version) === null) {
      log('nz-wlg'.magenta, 'New Version:', version)
      await WorkerManager.add({
        prefix: 'nz-wlg', 
        version: version
      })
      const worker = await WorkerManager.start('nz-wlg', version)
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

    const currentWorker = WorkerManager.getWorker(WorkerManager.getMapping('nz-wlg'))
    let versionDiff = false
    if (currentWorker !== null) {
      versionDiff = currentWorker.config.version !== meta[0]
    }

    if (start < now && now < end && versionDiff) {
      log('nz-wlg'.magenta, 'Mapping valid! Activating mapping.')
      await WorkerManager.start('nz-wlg', meta[0])
      await WorkerManager.setMapping('nz-wlg', meta[0])
      if (currentWorker !== null) {
        log('nz-wlg'.magenta, 'Stopping old worker.')
        await currentWorker.stop()
      }
    } else if (!versionDiff) {
      log('nz-wlg'.magenta, 'Version has not changed.')
    } else {
      log('nz-wlg'.magenta, 'Will not activate new version yet.')
    }
  }

  // copied from the server-worker, but that's okay.
  download() {
    return new Promise((resolve, reject) => {
      const url = 'https://www.metlink.org.nz/assets/Google_Transit/google-transit.zip'
      const gtfsRequest = request({url: url}).pipe(fs.createWriteStream(zipLocation))
      gtfsRequest.on('finish', function() {
        log('nz-wlg'.magenta, 'Downloaded Metlink Metadata')
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
        log('nz-wlg'.magenta, 'Unzipped Metlink Metadata')
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
module.exports = Wellington