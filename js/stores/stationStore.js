import Events from './events'
import local from '../../local'
import { SettingsStore } from './settingsStore.js'
import { t } from './translationStore.js'

export class stationStore extends Events {
  constructor(props) {
    super(props)
    this.currentCity = 'none'
    this.StationData = {}

    // sets the actual default city
    this.getCity(...SettingsStore.state.lastLocation)

    if (localStorage.getItem('StationData')) {
      this.StationData = JSON.parse(localStorage.getItem('StationData'))

      Object.keys(this.StationData).forEach((item) => {
        if (item.split('|').length !== 2) {
          this.StationData['nz-akl' + '|' + item] = this.StationData[item]
          delete this.StationData[item]
        }
      })
    }

    this.StationOrder = []
    if (localStorage.getItem('StationOrder')) {
      this.StationOrder = JSON.parse(localStorage.getItem('StationOrder'))

      // Upgrades...
      this.StationOrder = this.StationOrder.map((item) => {
        if (item.split('|').length !== 2) {
          return 'nz-akl' + '|' + item
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

  getIcon(station) {
    let icon = 'bus'
    if (station === 2) {
      icon = 'train'
    } else if (station === 4) {
      icon = 'ferry'
    } else if (station === 5) {
      icon = 'cablecar'
    }
    return icon
  }
  getCity(lat, lng, map = true) {
    let newCity = 'none'
    if (lat > -37.4 && lat < -36 && lng > 174 && lng < 175.2) {
      newCity = 'nz-akl'
    } else if (lat > -41.5 && lat < -40.5 && lng > 174.6 && lng < 175.8) {
      newCity = 'nz-wlg'
    }
    if (map === false) {
      return newCity
    }
    if (this.currentCity !== newCity ) {
      this.currentCity = newCity
      this.trigger('newcity')
      SettingsStore.state.lastLocation = [lat, lng]
      SettingsStore.saveState()
    }
  }
  getHeadsign(prefix, longname, direction) {
    if (prefix === 'nz-wlg') {
      let rawname = longname.split('(')
      if (rawname.length > 1) {
        rawname = rawname[1].replace(')', '')
      } else {
        rawname = longname
      }
      rawname = rawname.split(' - ')
      if (direction === 1) {
        rawname.reverse()
      }
      return rawname[0]
    }
    return longname
  }
  // persists data to localStorage
  saveData() {
    localStorage.setItem('StationData', JSON.stringify(this.StationData))
    localStorage.setItem('StationOrder', JSON.stringify(this.StationOrder))
  }
  getData(station, region = 'nz-akl') {
    if (typeof station === 'undefined') {
      return this.StationData
    }
    return new Promise((resolve, reject) => {
      if (typeof this.StationData[region + '|' + station] !== 'undefined') {
        return resolve(this.StationData[region + '|' + station])
      } else if (typeof this.stationCache[station] !== 'undefined') {
        return resolve(this.stationCache[station])
      }
      if (station.split('+').length > 1) {
        return resolve({
          stop_lat: 0,
          stop_lon: 0,
          stop_name: t('savedStations.multi')
        })
      }
      fetch(`${local.endpoint}/${region}/station/${station}`).then((response) => {
        if (response.status === 404) {
          throw new Error(response.status)
        } else {
          response.json().then(resolve)
        }
      }).catch(err => reject(err))
    })
  }
  getOrder(region = null) {
    if (region) {
      return this.StationOrder.filter((item) => {
        return this.StationData[item].region === region || typeof(this.StationData[item].region) === 'undefined'
      })
    }
    return this.StationOrder
  }
  addStop(stopNumber, stopName, region) {
    if (stopNumber.trim() === '') {
      return
    }
    const promises = stopNumber.split('+').map((station) => {
      return new Promise((resolve, reject) => {
        fetch(`${local.endpoint}/${region}/station/${station}`).then((response) => {
          response.json().then(resolve)
        })
      })
    })
    Promise.all(promises).then((dataCollection) => {
      dataCollection.forEach((data, key) => {
        let no = stopNumber.split('+')[key]
        let description = t('savedStations.stop', {number: `${no} / ${data.stop_name}`})
        let icon = this.getIcon(data.route_type)

        let zName = stopName
        if (stopNumber.split('+').length > 1) {
          zName = data.stop_name
        }
        this.StationData[region + '|' + no] = {
          name: zName || data.stop_name,
          stop_lat: data.stop_lat,
          stop_lon: data.stop_lon,
          description: description,
          icon: icon,
          region: region
        }
      })

      if (stopNumber.split('+').length > 1) {
        this.StationData[region + '|' + stopNumber] = {
          name: stopName || t('savedStations.multi'),
          stop_lat: 0,
          stop_lon: 0,
          description: t('savedStations.stops', {number: stopNumber.split('+').join(', ')}),
          icon: 'multi',
          region: region
        }
      }

      // so we don't have duplicates
      if (this.StationOrder.indexOf(region + '|' + stopNumber) === -1) {
        this.StationOrder.push(region + '|' + stopNumber)
      }
      this.trigger('change')
      this.saveData()
    })
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
  getLines(prefix = 'nz-akl') {
    return new Promise((resolve, reject) => {
      if (Object.keys(this.lineCache).length === 0 || this.lineCacheRegion !== prefix) {
        if (!navigator.onLine) {
          reject(t('app.nointernet'))
          return
        }
        fetch(`${local.endpoint}/${prefix}/lines`).then((response)=>{
          response.json().then((data) => {
            this.lineCache = data
            this.lineCacheRegion = prefix
            resolve(data)
          })
        }).catch(() => {
          reject(t('lines.error'))
        })
      } else {
        resolve(this.lineCache)
      }
    })
  }
  getTimes = (stations, region = 'nz-akl') => {
    if (!navigator.onLine) {
      this.trigger('error', t('app.nointernet'))
      return
    }
    const promises = stations.split('+').map((station) => {
      return new Promise((resolve, reject) => {
        fetch(`${local.endpoint}/${region}/station/${station}/times`).then((response) => {    
          response.json().then(resolve)
        }).catch((err) => {
          reject(err)
        })
      })
    })
    Promise.all(promises).then((allData) => {
      this.setOffset(allData[0].currentTime)

      let trips = []
      let realtime = {}
      allData.forEach((data) => {
        trips = trips.concat(data.trips)
        realtime = Object.assign(realtime, data.realtime)
      })
      trips.sort((a,b) => {
        return a.departure_time_seconds - b.departure_time_seconds
      })
      this.timesFor = [stations, new Date()]
      this.tripData = trips
      this.realtimeData = realtime
      this.trigger('times', stations)
    }).catch(() => {
      this.trigger('error', t('station.error'))
    })
  }
  setOffset(time) {
    let offsetTime = new Date()
    offsetTime.setHours(0)
    offsetTime.setMinutes(0)
    offsetTime.setSeconds(0)
    offsetTime.setSeconds(time)
    this.offsetTime = offsetTime.getTime() - new Date().getTime()
  }
  getRealtime(tripData, stop_id = null, region = 'nz-akl') {
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

    const queryString = {}
    tripData.filter(function(trip) {
      const arrival = new Date()
      if (arrival.getHours() < 5) {
        arrival.setDate(arrival.getDate() - 1)
      }
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.departure_time_seconds))

      // only gets realtime info for things +30mins away
      if (arrival.getTime() < (new Date().getTime() + 1800000)) {
        return true
      }
      return false
    }).forEach(trip => {
      queryString[trip.trip_id] = {
        departure_time_seconds: trip.departure_time_seconds,
        route_short_name: trip.route_short_name,
      }
    })

    // we need to pass an extra param for train trips
    let requestData = {
      stop_id: stop_id,
      trips: queryString
    }
    if (route_type === 2) {
      requestData.train = true
    }

    // now we do a request to the realtime API
    fetch(`${local.endpoint}/${region}/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    }).then((response) => {
      response.json().then((data) => {
        this.realtimeData = data
        this.trigger('realtime')
      })
    })
  }
  getTimetable(station, route, direction, region = 'nz-akl') {
    const sortfn = function(a, b) {
      return a.departure_time_seconds - b.departure_time_seconds
    }
    return new Promise((resolve, reject) => {
      fetch(`${local.endpoint}/${region}/station/${station}/timetable/${route}/${direction}`).then((request) => {
        request.json().then((data) => {
          this.setOffset(data[0].currentTime)
          data.sort(sortfn)
          resolve(data)
        })
      }).catch(reject)
    })
  }
}
export let StationStore = new stationStore()