import fetch from 'node-fetch'
import moment from 'moment-timezone'
import logger from '../logger'

interface ATUpdaterProps {
  apiKey: string
  callback: any
  delay: number
  interval: number
}

class ATUpdater {
  apiKey: string
  callback: any
  delay: number
  interval: number
  prefix: string
  timeout: NodeJS.Timeout
  constructor(props: ATUpdaterProps) {
    const { apiKey, callback, delay, interval } = props
    this.apiKey = apiKey
    this.callback = callback
    this.delay = delay || 5
    this.interval = interval || 1440
    this.prefix = 'nz-akl'

    this.timeout = null

  }

  start = async () => {
    const { check, delay, apiKey, prefix } = this
    if (!apiKey) {
      logger.error({ prefix }, 'API Key must be supplied!')
      return
    }

    logger.info({ prefix, mins: delay }, 'Waiting to download.')
    this.timeout = setTimeout(check, delay * 60000)
  }

  check = async () => {
    const { callback, check, interval, checkApi, prefix } = this

    try {
      const versions = await checkApi()
      versions.forEach(version => {
        logger.info({ prefix, version: version.version }, 'Found version.')

        const now = moment().tz('Pacific/Auckland')
        const start = moment(version.startdate).tz('Pacific/Auckland')
        const end = moment(version.enddate).tz('Pacific/Auckland')

        // Only adjust the mapping if we're within the correct interval
        const adjustMapping = start < now && now < end
        callback(prefix, version.version, adjustMapping)
      })
    } catch (err) {
      logger.error({ err }, 'Could not update.')
    }

    logger.info(
      { prefix, mins: interval },
      'Check complete - re-scheduled download.'
    )
    this.timeout = setTimeout(check, interval * 60000)
  }

  checkApi = async () => {
    const { apiKey } = this
    const options = {
      url: 'https://api.at.govt.nz/v2/gtfs/versions',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    }
    const response = await fetch(options.url, {
      headers: options.headers,
    })
    const data = await response.json()
    return data.response
  }

  stop = () => {
    const { prefix } = this
    logger.info({ prefix }, 'Stopped updater.')
    clearTimeout(this.timeout)
  }
}
export default ATUpdater
