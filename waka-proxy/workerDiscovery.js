const fetch = require('node-fetch')
const cityMetadata = require('../cityMetadata.json')
const logger = require('./logger.js')

class WorkerDiscovery {
  constructor(props) {
    this.endpoint = props.endpoint
    this.interval = 0
    this.responseMap = new Map()

    this.checkCities = this.checkCities.bind(this)
  }

  start() {
    this.checkCities()

    // don't imagine it updating more than once every minute
    clearInterval(this.interval)
    this.interval = setInterval(this.checkCities, 60000)
  }

  checkCities() {
    logger.info('checking cities')
    Object.keys(cityMetadata).forEach(prefix => this.checkCity(prefix))
  }

  async checkCity(prefix) {
    const request = await fetch(`${this.endpoint}/${prefix}/info`)
    let message = null
    if (request.status === 200) {
      const data = await request.json()
      this.responseMap.set(prefix, data)
      message = `${prefix} is available`
    } else {
      this.responseMap.delete(prefix)
      message = `${prefix} is unavailable`
    }
    logger.info({ prefix, status: request.status }, message)
  }

  getRegionByBounds(lat, lon) {
    let region = 'nz-akl' // default
    this.responseMap.forEach(response => {
      const { prefix, bounds } = response
      if (
        lat >= bounds.lat.min &&
        lat <= bounds.lat.max &&
        lon >= bounds.lon.min &&
        lon <= bounds.lon.max
      ) {
        region = prefix
      }
    })
    return region
  }

  getRegions() {
    const availableRegions = {}
    this.responseMap.forEach(response => {
      const { prefix } = response
      const meta = cityMetadata[prefix]

      // takes a subset of the object
      const unwrap = ({
        name,
        secondaryName,
        longName,
        initialLocation,
        showInCityList,
      }) => ({
        prefix,
        name,
        secondaryName,
        longName,
        initialLocation,
        showInCityList,
      })

      if (Object.prototype.hasOwnProperty.call(meta, 'name')) {
        // this is if there is a 1-1 mapping of region to setting
        availableRegions[prefix] = unwrap(meta)
      } else {
        // this is if there are multiple cities to a region
        Object.keys(meta).forEach(
          city => (availableRegions[city] = unwrap(meta[city]))
        )
      }
    })
    return availableRegions
  }
}
module.exports = WorkerDiscovery
