import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import axios from 'axios'
import extract from 'extract-zip'
import csvparse from 'csv-parse'
import transform from 'stream-transform'
import moment from 'moment-timezone'
import logger from '../logger'
import { BasicUpdaterProps } from '../../typings'
import { prefixToTimezone } from '../../utils'

class BasicUpdater {
  prefix: string
  callback: (
    prefix: string,
    version: string,
    adjustMapping: boolean
  ) => Promise<void>
  delay: number
  interval: number
  url: string
  timeout: NodeJS.Timeout
  fallback: string
  constructor(props: BasicUpdaterProps) {
    const { prefix, callback, delay, interval, url } = props
    this.prefix = prefix
    this.callback = callback
    this.delay = delay || 5
    this.interval = interval || 1440
    this.url = url
    this.timeout = null
  }

  start = async () => {
    const { prefix, check, delay, url } = this
    await check()
    if (!url) {
      logger.error({ prefix }, 'URL must be supplied!')
      return
    }

    logger.info({ prefix, mins: delay }, 'Waiting to download.')
    this.timeout = setTimeout(check, delay * 60000)
  }

  check = async () => {
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
      logger.info({ prefix }, 'Starting download.')
      const filePath = await download()
      logger.info({ prefix }, 'Downloaded file.')

      const gtfsPath = await unzip(filePath)
      logger.info({ prefix }, 'Unzipped file.')

      const version = await findVersion(gtfsPath)
      logger.info({ prefix, version: version.version }, 'Found version.')
      if (!version.force) {
        const timezone = prefixToTimezone(prefix)
        const now = moment().tz(timezone)
        const start = moment(version.startDate).tz(timezone)
        const end = moment(version.endDate).tz(timezone)

        // Only adjust the mapping if we're within the correct interval
        const adjustMapping = start < now && now < end

        // callbacks are gross, but it's ideal in this scenario
        // because we want to run it on an interval
        callback(prefix, version.version, adjustMapping)
      } else {
        callback(prefix, version.version, true)
      }
    } catch (err) {
      logger.error({ prefix, err }, 'Could not update.')
    }

    logger.info(
      { prefix, mins: interval },
      'Check complete - re-scheduled download.'
    )
    this.timeout = setTimeout(check, interval * 60000)
  }

  download = async () => {
    const { prefix, url } = this
    const res = await axios.get(url, { responseType: 'stream' })
    // console.log(res)
    const { headers } = res
    if (res.headers['last-modified']) {
      const newest = new Date(headers['last-modified'])
      const year = newest.getUTCFullYear()
      const month = newest.getUTCMonth() + 1
      const date = newest.getUTCDate()
      const newVersion = `${year}${month
        .toString()
        .padStart(2, '0')}${date.toString().padStart(2, '0')}`
      this.fallback = newVersion
    }
    const destination = path.join(os.tmpdir(), `${prefix}.zip`)
    const dest = fs.createWriteStream(destination)
    res.data.pipe(dest)
    return new Promise<string>((resolve, reject) => {
      dest.on('finish', () => {
        resolve(destination)
      })
      dest.on('error', reject)
    })
  }

  unzip = async (zipLocation: string) => {
    const { prefix } = this
    return new Promise<string>((resolve, reject) => {
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

  findVersion = async (gtfsLocation: string) => {
    return new Promise<{
      version: string
      startDate?: string
      endDate?: string
      force?: boolean
    }>((resolve, reject) => {
      // checks to see if the file has a feed_info.txt
      let feedLocation = 'feed_info.txt'
      try {
        fs.statSync(path.resolve(gtfsLocation, feedLocation))
      } catch (err) {
        feedLocation = 'calendar.txt'
      }

      const input = fs.createReadStream(
        path.resolve(gtfsLocation, feedLocation)
      )
      const parser = csvparse({ delimiter: ',' })

      let headers: string[] = null
      const transformer = transform((row, callback) => {
        if (!headers) {
          headers = row
          callback()
        } else if (feedLocation === 'feed_info.txt') {
          resolve({
            version: row[headers.indexOf('feed_version')],
            startDate: row[headers.indexOf('feed_start_date')],
            endDate: row[headers.indexOf('feed_end_date')],
          })
          transformer.end()
        } else if (this.fallback) {
          resolve({ version: this.fallback, force: true })
        } else if (feedLocation === 'calendar.txt') {
          // if there's no feed info, just use the start_date + end_date as the name
          resolve({
            version:
              row[headers.indexOf('start_date')] +
              row[headers.indexOf('end_date')],
            startDate: row[headers.indexOf('start_date')],
            endDate: row[headers.indexOf('end_date')],
          })
          transformer.end()
        }
      })
      transformer.on('error', reject)
      input.pipe(parser).pipe(transformer)
    })
  }

  stop = () => {
    const { prefix } = this
    logger.info({ prefix }, 'Stopped updater.')
    clearTimeout(this.timeout)
  }
}
export default BasicUpdater
