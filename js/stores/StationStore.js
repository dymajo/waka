import Events from './Events'
import local from '../../local.js'
import SettingsStore from './SettingsStore.js'
import { t } from './translationStore.js'
import { getIconName } from '../views/maps/util.jsx'

class StationStore extends Events {
  stationCache = {}

  constructor(props) {
    super(props)
    this.currentCity = {
      prefix: 'none',
      name: '',
      longName: '',
      secondaryName: '',
      version: '',
    }
    this.StationData = {}

    // sets the actual default city
    this.getCity(...SettingsStore.state.lastLocation)

    if (localStorage.getItem('StationData')) {
      this.StationData = JSON.parse(localStorage.getItem('StationData'))

      Object.keys(this.StationData).forEach(item => {
        if (item.split('|').length !== 2) {
          this.StationData[`${'nz-akl' + '|'}${item}`] = this.StationData[item]
          delete this.StationData[item]
        }
      })
    }

    this.StationOrder = []
    if (localStorage.getItem('StationOrder')) {
      this.StationOrder = JSON.parse(localStorage.getItem('StationOrder'))

      // Upgrades...
      this.StationOrder = this.StationOrder.map(item => {
        if (item.split('|').length !== 2) {
          return `${'nz-akl' + '|'}${item}`
        }
        return item
      })
    }

    this.saveData()
  }

  getDirection(region, directionId) {
    if (region === 'nz-akl') {
      directionId = !directionId ? 1 : 0
    }
    return directionId === 0 ? 'Outbound' : 'Inbound'
  }

  async getCity(lat, lon) {
    const res = await fetch(`${local.endpoint}/auto/info?lat=${lat}&lon=${lon}`)
    const data = await res.json()
    if (this.currentCity.prefix !== data.prefix) {
      this.currentCity = data
      this.trigger('newcity')
      SettingsStore.state.lastLocation = [lat, lon]
      SettingsStore.saveState()
    }
  }

  // persists data to localStorage
  saveData() {
    localStorage.setItem('StationData', JSON.stringify(this.StationData))
    localStorage.setItem('StationOrder', JSON.stringify(this.StationOrder))
  }

  async getData(station, region) {
    if (typeof station === 'undefined') {
      return this.StationData
    }
    let data = null
    if (typeof this.StationData[`${region}|${station}`] !== 'undefined') {
      data = this.StationData[`${region}|${station}`]
    }
    if (station.split('+').length > 1) {
      data = {
        stop_lat: 0,
        stop_lon: 0,
        stop_name: t('savedStations.multi'),
      }
    }
    if (data && data.icon !== 'parkingbuilding') {
      return data
    }
    const res = await fetch(`${local.endpoint}/${region}/station/${station}`)

    if (res.status === 404) {
      throw new Error(res.status)
    } else {
      const data = await res.json()
      return data
    }
  }

  getOrder(region = null) {
    if (region) {
      return this.StationOrder.filter(
        item =>
          this.StationData[item].region === region ||
          typeof this.StationData[item].region === 'undefined'
      )
    }
    return this.StationOrder
  }

  async addStop(stopNumber, stopName, region) {
    if (stopNumber.trim() === '') {
      return
    }
    const promises = stopNumber.split('+').map(async station => {
      try {
        const res = await fetch(
          `${local.endpoint}/${region}/station/${station}`
        )
        const data = await res.json()
        return data
      } catch (error) {
        throw new Error(error)
      }
    })
    const dataCollection = await Promise.all(promises)
    dataCollection.forEach((data, key) => {
      const no = stopNumber.split('+')[key]
      const icon = getIconName(region, data.route_type, 'SavedStations')
      let description = t('savedStations.stop', {
        number: `${no} / ${data.stop_name}`,
      })
      if (icon === 'parkingbuilding') {
        description = data.stop_name
      }

      let zName = stopName
      if (stopNumber.split('+').length > 1) {
        zName = data.stop_name
      }
      this.StationData[`${region}|${no}`] = {
        name: zName || data.stop_name,
        stop_lat: data.stop_lat,
        stop_lon: data.stop_lon,
        description,
        icon,
        region,
      }
    })

    if (stopNumber.split('+').length > 1) {
      this.StationData[`${region}|${stopNumber}`] = {
        name: stopName || t('savedStations.multi'),
        stop_lat: dataCollection[0].stop_lat,
        stop_lon: dataCollection[0].stop_lon,
        description: t('savedStations.stops', {
          number: stopNumber.split('+').join(', '),
        }),
        icon: 'multi',
        region,
      }
    }

    // so we don't have duplicates
    if (this.StationOrder.indexOf(`${region}|${stopNumber}`) === -1) {
      this.StationOrder.push(`${region}|${stopNumber}`)
    }
    this.trigger('change')
    this.saveData()
  }

  removeStop(stopNumber) {
    const index = this.StationOrder.indexOf(stopNumber)
    if (index > -1) {
      this.StationOrder.splice(index, 1)
      delete this.StationData[stopNumber]
      this.trigger('change')
      this.saveData()
    }
  }
}
export default new StationStore()
