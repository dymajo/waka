import axios from 'axios'
import Events from './Events'
import local from '../../local.js'
import SettingsStore from './SettingsStore.js'
import { t } from './translationStore.js'
import iconhelper from '../helpers/icon.js'

const IconHelper = new iconhelper()

class StationStore extends Events {
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

  timesFor = [null, new Date(0)]

  stationCache = {}

  tripData = []

  realtimeData = {}

  lineCache = {}

  lineCacheRegion = null

  getDirection(region, direction_id) {
    if (region === 'nz-akl') {
      direction_id = !direction_id ? 1 : 0
    }
    return direction_id === 0 ? 'Outbound' : 'Inbound'
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
    } else if (typeof this.stationCache[station] !== 'undefined') {
      data = this.stationCache[station]
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
      const icon = IconHelper.getRouteType(data.route_type)
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

  async getLines(prefix = 'nz-akl') {
    if (
      Object.keys(this.lineCache).length === 0 ||
      this.lineCacheRegion !== prefix
    ) {
      if (!navigator.onLine) {
        throw new Error(t('app.nointernet'))
      }
      try {
        const res = await fetch(`${local.endpoint}/${prefix}/all-lines`)
        const data = await res.json()
        this.lineCache = data
        this.lineCacheRegion = prefix
        return data
      } catch (error) {
        throw new Error(t('lines.error'))
      }
    } else {
      return this.lineCache
    }
  }

  getTimes = async (stations, region) => {
    if (!navigator.onLine) {
      this.trigger('error', t('app.nointernet'))
      return
    }
    const promises = stations.split('+').map(async station => {
      try {
        const res = await fetch(
          `${local.endpoint}/${region}/station/${station}/times`
        )
        const data = await res.json()
        data.trips = data.trips.map(trip => {
          trip.station = station
          return trip
        })
        return data
      } catch (error) {
        throw new Error(error)
      }
    })
    try {
      const allData = await Promise.all(promises)
      this.setOffset(allData[0].currentTime)
      if (allData.length > 0) {
        if ('html' in allData[0]) {
          this.trigger('html', allData[0])
          return
        }
      }

      let trips = []
      let realtime = {}
      allData.forEach(data => {
        trips = trips.concat(data.trips)
        realtime = Object.assign(realtime, data.realtime)
      })
      trips.sort((a, b) => a.departure_time_seconds - b.departure_time_seconds)
      this.timesFor = [stations, new Date()]
      this.tripData = trips
      this.realtimeData = this.realtimeModifier(
        trips,
        realtime,
        stations,
        region
      )
      this.trigger('times', stations)
    } catch (err) {
      console.error(err)
      this.trigger('error', t('station.error'))
    }
  }

  setOffset(time) {
    const offsetTime = new Date()
    offsetTime.setHours(0)
    offsetTime.setMinutes(0)
    offsetTime.setSeconds(0)
    offsetTime.setSeconds(time)
    this.offsetTime = offsetTime.getTime() - new Date().getTime()
  }

  async getRealtime(tripData, stop_id = null, region) {
    if (tripData.length === 0) {
      return
    }
    // realtime request for buses and trains
    // not ferries though
    let route_type
    if (this.timesFor[0].split('+').length > 1) {
      route_type = 3
    } else if (tripData.length > 0) {
      route_type = tripData[0].route_type
    }
    if (tripData.length === 0 || tripData[0].route_type === 4) {
      return
    }

    const queryString = []
    tripData
      .filter(trip => {
        const arrival = new Date()
        if (arrival.getHours() < 5) {
          arrival.setDate(arrival.getDate() - 1)
        }
        arrival.setHours(0)
        arrival.setMinutes(0)
        arrival.setSeconds(parseInt(trip.departure_time_seconds, 10))
        // only gets realtime info for things +30mins away
        if (arrival.getTime() < new Date().getTime() + 3600000) {
          return true
        }
        return false
      })
      .forEach(trip => {
        queryString.push(trip.trip_id)
      })

    // we need to pass an extra param for train trips
    const requestData = {
      stop_id,
      trips: queryString,
    }
    if (route_type === 2 && region === 'nz-akl') {
      requestData.train = true
    }
    // now we do a request to the realtime API
    const res = await fetch(`${local.endpoint}/${region}/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })
    const data = await res.json()
    this.realtimeData = this.realtimeModifier(tripData, data, stop_id, region)
    this.trigger('realtime')
  }

  // from https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
  getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const deg2rad = deg => {
      return deg * (Math.PI / 180)
    }
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1) // deg2rad below
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }

  realtimeModifier(tripData, rtData, stop, region) {
    if (tripData.length > 0 && tripData[0].route_type === 2) {
      const stationId = `${region}|${stop.split('+')[0]}`
      const station =
        this.StationData[stationId] ||
        this.stationCache[stationId.split('|')[1]]
      if (typeof station === 'undefined') {
        return {}
      }
      const pos = [station.stop_lat, station.stop_lon]
      for (const key in rtData) {
        rtData[key] = {
          v_id: rtData[key].v_id,
          distance: this.getDistanceFromLatLonInKm(
            rtData[key].latitude,
            rtData[key].longitude,
            pos[0],
            pos[1]
          ),
        }
      }
    }
    return rtData
  }

  async getTimetable(station, route, direction, region, offset = 0) {
    const sortfn = (a, b) => {
      return a.departure_time_seconds - b.departure_time_seconds
    }
    try {
      const res = await fetch(
        `${local.endpoint}/${region}/station/${station}/timetable/${route}/${direction}/${offset}`
      )
      const data = await res.json()
      if (data.length > 0) {
        this.setOffset(data[0].currentTime)
        data.sort(sortfn)
      }
      return data
    } catch (error) {
      throw new Error(error)
    }
  }
}
export default new StationStore()
