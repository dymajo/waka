const fetch = require('node-fetch')
const moment = require('moment-timezone')
const logger = require('../logger.js')

const tfnswmodes = {
  buses1: { endpoint: 'buses/SMBSC001' },
  buses2: { endpoint: 'buses/SMBSC002' },
  buses3: { endpoint: 'buses/SMBSC003' },
  buses4: { endpoint: 'buses/SMBSC004' },
  busse5: { endpoint: 'buses/SMBSC005' },
  buses6: { endpoint: 'buses/SBSC006' },
  buses7: { endpoint: 'buses/SMBSC007' },
  buses8: { endpoint: 'buses/SMBSC008' },
  buses9: { endpoint: 'buses/SMBSC009' },
  buses10: { endpoint: 'buses/SMBSC010' },
  buses11: { endpoint: 'buses/SMBSC012' },
  buses12: { endpoint: 'buses/SMBSC013' },
  buses13: { endpoint: 'buses/SMBSC014' },
  buses14: { endpoint: 'buses/SMBSC015' },
  buses15: { endpoint: 'buses/OSMBSC001' },
  buses16: { endpoint: 'buses/OSMBSC002' },
  buses17: { endpoint: 'buses/OSMBSC003' },
  buses18: { endpoint: 'buses/OSMBSC004' },
  buses19: { endpoint: 'buses/OSMBSC006' },
  buses20: { endpoint: 'buses/OSMBSC007' },
  buses21: { endpoint: 'buses/OSMBSC008' },
  buses22: { endpoint: 'buses/OSMBSC009' },
  buses23: { endpoint: 'buses/OSMBSC010' },
  buses24: { endpoint: 'buses/OSMBSC011' },
  buses25: { endpoint: 'buses/OSMBSC012' },
  buses26: { endpoint: 'buses/NISC001' },
  buses27: { endpoint: 'buses/ECR109' },
  ferries: { endpoint: 'ferries' },
  lightrail1: { endpoint: 'lightrail/innerwest' },
  lightrail2: { endpoint: 'lightrail/newcastle' },
  trains1: { endpoint: 'nswtrains' },
  trains2: { endpoint: 'sydneytrains' },
}

class TfNSWUpdater {
  constructor(props) {
    const { apiKey, callback, delay, interval } = props
    this.apiKey = apiKey
    this.callback = callback
    this.delay = delay || 5
    this.interval = interval || 1440
    this.prefix = 'au-syd'

    this.timeout = 0
    this.start = this.start.bind(this)
    this.check = this.check.bind(this)
    this.checkApi = this.checkApi.bind(this)
    this.stop = this.stop.bind(this)
  }

  async start() {
    const { apiKey, check, delay, prefix } = this
    if (!apiKey) {
      logger.error({ prefix }, 'API Key must be supplied!')
    }

    logger.info({ prefix, mins: delay }, 'Waiting to download.')

    // begin check
    this.check()
    this.timeout = setTimeout(check, delay * 60000)
  }

  async check() {
    const { callback, check, interval, checkApi } = this
    try {
      for (const mode in tfnswmodes) {
        const { endpoint } = tfnswmodes[mode]
        const version = await checkApi(endpoint)
        console.log(version)
      }
    } catch (err) {
      logger.error({ err }, 'Could not update.')
    }
  }

  async checkApi(endpoint) {
    const { apiKey } = this
    const options = {
      url: `https://api.transport.nsw.gov.au/v1/gtfs/schedule/${endpoint}`,
      headers: {
        Authorization: apiKey,
      },
      method: 'HEAD',
    }
    const response = await fetch(options.url, {
      method: options.method,
      headers: options.headers,
    })

    // return response.headers['last-modified']
    return new Date(response.headers.get('last-modified')).getTime()
  }

  stop() {
    const { prefix } = this
    logger.info({ prefix }, 'Stopped updater.')
    clearTimeout(this.timeout)
  }
}

module.exports = TfNSWUpdater
