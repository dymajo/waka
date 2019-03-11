const fetch = require('node-fetch')
const moment = require('moment-timezone')
const logger = require('../logger.js')

class ATUpdater {
  constructor(props) {
    const { apiKey, callback, delay, interval } = props
    this.apiKey = apiKey
    this.callback = callback
    this.delay = delay || 5
    this.interval = interval || 1440

    this.timeout = 0
    this.start = this.start.bind(this)
    this.check = this.check.bind(this)
    this.checkApi = this.checkApi.bind(this)
  }

  async start() {
    const { check, delay, apiKey } = this
    if (!apiKey) {
      logger.error({ prefix: 'nz-akl' }, 'API Key must be supplied!')
      return
    }

    logger.info({ prefix: 'nz-akl', mins: delay }, 'Waiting to download.')
    this.timeout = setTimeout(check, delay * 60000)
  }

  async check() {
    const { callback, check, interval, checkApi } = this

    try {
      const versions = await checkApi()
      versions.forEach(version => {
        logger.info(
          { prefix: 'nz-akl', version: version.version },
          'Found version.'
        )

        const now = moment().tz('Pacific/Auckland')
        const start = moment(version.startdate).tz('Pacific/Auckland')
        const end = moment(version.enddate).tz('Pacific/Auckland')

        // Only adjust the mapping if we're within the correct interval
        const adjustMapping = start < now && now < end
        callback('nz-akl', version.version, adjustMapping)
      })
    } catch (err) {
      logger.error({ err }, 'Could not update.')
    }

    logger.info(
      { prefix: 'nz-akl', mins: interval },
      'Check complete - re-scheduled download.'
    )
    this.timeout = setTimeout(check, interval * 60000)
  }

  async checkApi() {
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

  stop() {
    logger.info({ prefix: 'nz-akl' }, 'Stopped updater.')
    clearTimeout(this.timeout)
  }
}
module.exports = ATUpdater
