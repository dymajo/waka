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

class Otago {
  start() {
  }
  async pull() {
  }
  async adjustMapping() {
  }

  // copied from the server-worker, but that's okay.
  download() {
  }
  unzip() {
    return new Promise((resolve, reject) => {
      extract(zipLocation, {dir: path.resolve(zipLocation + 'unarchived')}, function (err) {
        if (err) {
          return reject()
        }
        log('au-syd'.magenta, 'Unzipped Otago Metadata')
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
module.exports = Otago