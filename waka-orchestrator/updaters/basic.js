const fs = require('fs')
const os = require('os')
const path = require('path')
const extract = require('extract-zip')
const fetch = require('node-fetch')
const csvparse = require('csv-parse')
const transform = require('stream-transform')
const moment = require('moment-timezone')
const logger = require('../logger.js')

class BasicUpdater {
  constructor(props) {
    const { prefix, callback, delay, interval, url } = props
    this.prefix = prefix
    this.callback = callback
    this.delay = delay || 5
    this.interval = interval || 1440
    this.url = url

    if (!url) {
      throw new Error('URL must be supplied!')
    }

    this.timeout = 0
    this.start = this.start.bind(this)
    this.check = this.check.bind(this)
    this.download = this.download.bind(this)
    this.unzip = this.unzip.bind(this)
    this.findVersion = this.findVersion.bind(this)
    this.stop = this.stop.bind(this)
  }

  async start() {
    const { prefix, check, delay } = this

    logger.info({ prefix, mins: delay }, 'Waiting to download.')
    this.timeout = setTimeout(check, delay * 60000)
  }

  async check() {
    const {
      prefix,
      callback,
      check,
      interval,
      download,
      unzip,
      findVersion,
    } = this

    try {
      const filePath = await download()
      logger.info({ prefix }, 'Downloaded file.')

      const gtfsPath = await unzip(filePath)
      logger.info({ prefix }, 'Unzipped file.')

      const version = await findVersion(gtfsPath)
      logger.info({ prefix, version: version.version }, 'Found version.')

      // TODO: revisit when we do more than just NZ
      const now = moment().tz('Pacific/Auckland')
      const start = moment(version.startDate).tz('Pacific/Auckland')
      const end = moment(version.endDate).tz('Pacific/Auckland')

      // Only adjust the mapping if we're within the correct interval
      const adjustMapping = start < now && now < end

      // callbacks are gross, but it's ideal in this scenario
      // because we want to run it on an interval
      callback(prefix, version.version, adjustMapping)
    } catch (err) {
      logger.error({ err }, 'Could not update.')
    }

    logger.info(
      { prefix, mins: interval },
      'Check complete - re-scheduled download.'
    )
    this.timeout = setTimeout(check, interval * 60000)
  }

  async download() {
    const { prefix, url } = this
    return new Promise(async (resolve, reject) => {
      const response = await fetch(url)
      const destination = path.join(os.tmpdir(), `${prefix}.zip`)
      const dest = fs.createWriteStream(destination)
      response.body.pipe(dest)
      dest.on('finish', () => resolve(destination))
      dest.on('error', reject)
    })
  }

  async unzip(zipLocation) {
    const { prefix } = this
    return new Promise((resolve, reject) => {
      const dir = path.join(os.tmpdir(), prefix)
      extract(zipLocation, { dir }, err => {
        if (err) {
          reject()
        } else {
          resolve(dir)
        }
      })
    })
  }

  async findVersion(gtfsLocation) {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(
        path.resolve(gtfsLocation, 'feed_info.txt')
      )
      const parser = csvparse({ delimiter: ',' })

      let headers = null
      const transformer = transform((row, callback) => {
        if (!headers) {
          headers = row
          callback()
        } else {
          resolve({
            version: row[headers.indexOf('feed_version')],
            startDate: row[headers.indexOf('feed_start_date')],
            endDate: row[headers.indexOf('feed_end_date')],
          })
          transformer.end()
        }
      })
      transformer.on('error', reject)
      input.pipe(parser).pipe(transformer)
    })
  }

  stop() {
    logger.info({ prefix }, 'Stopped updater.')
    clearTimeout(this.timeout)
  }
}
module.exports = BasicUpdater
