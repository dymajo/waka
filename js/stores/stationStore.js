import Events from './events'

export class stationStore extends Events {
  constructor(props) {
    super(props)
    this.trainStations = [
      '0133','0115', // britomart, newmarket
      '0277','0118','0122','0104','0119','0120','0105','0129','0123','0124','0121','0125','0126','0128','0127', // western line
      '0114','0113','0112','0102','0606','0605', // onehunga line
      '0140', '0111','0101','0109','0100','0108','0099','0098','0107','0106','0097','0134', // southern line
      '0116','0117','0103','0130','0244','9218' // eastern line
    ]
    // not in any order
    this.ferryStations = [
      '9600','9610','9623','9630','9670','9690','9730',
      '9660','9650','9720','9810','9640','9770','9760',
      '9790','9740','9700','9604','9620','9603','9750']

    this.StationData = {}
    if (localStorage.getItem('StationData')) {
      this.StationData = JSON.parse(localStorage.getItem('StationData'))
    }

    this.StationOrder = []
    if (localStorage.getItem('StationOrder')) {
      this.StationOrder = JSON.parse(localStorage.getItem('StationOrder'))
    }
  }
  timesFor = [null, new Date(0)]
  stationCache = {}
  tripData = []
  realtimeData = {}
  lineCache = {}

  getIcon(station) {
    var icon = 'bus'
    if (this.trainStations.indexOf(station) != -1) {
      icon = 'train'
    } else if (this.ferryStations.indexOf(station) != -1) {
      icon = 'ferry'
    }
    return icon
  }
  getColor(agency_id, code){
    switch(agency_id){
    case 'AM': // Auckland Metro
      switch (code) {
      case 'WEST': // West Line
        //return '#006553' official
        return '#4f9734'
      case 'STH': // South Line
        //return '#a60048' official
        return '#e52f2b'
      case 'EAST': // East Line
        return '#f39c12'
      case 'PUK': // South Line
        //return '#a60048'
        return '#e52f2b'
      case 'ONE': // ONE Line
        return '#21b4e3'
      default:
        return '#17232f'
      }
    case 'FGL': // Fullers
      return '#2756a4'

    case 'HE': // Howick and Eastern
      return '#2196F3'

    case 'NZBGW': // NZ Bus - Go West
      return '#4CAF50'

    case 'NZBML': // NZ Bus - metrolink
      switch (code) {
      case 'CTY': // City Link
        return '#ef3c34'

      case 'INN': // Inner Link
        return '#41b649'

      case 'OUT': // Outer Link
        return '#f7991c'
      
      default:
        return '#0759b0'
      }

    case 'NZBNS': // NZ Bus - North Star
      return '#f39c12'

    case 'NZBWP': // NZ Bus - Waka Pacific
      return '#0f91ab'

    case 'UE': // Urban Express / Same as Pavolich
      return '#776242'

    case 'BTL': // Birkenhead Transport
      return '#b2975b'

    case 'RTH': // Ritchies
      switch (code) {
      case 'NEX': // Northern Express
        //return '#0079c2' official
        return '#0056a9' 
      
      default:
        return '#ff6f2c'
      }

    case 'WBC': // Waiheke Bus Company
      return '#2196F3'

    case 'EXPNZ': // Explore Waiheke - supposed to be closed?
      return '#ffe81c'

    case 'BFL': // Belaire Ferries
      return '#ffd503'

    case 'ATAPT': // AT Airporter
      return '#f7931d'

    case 'SLPH': // Pine Harbour / Sealink
      return '#d92732'

    case 'GBT': // Go Bus
      return '#58aa17'

    case '360D': // 360 Discovery
      return '#2756a4'

    case 'ABEXP': //Skybus
      return '#F44336'

    case 'PC': // Pavolich
      return '#776242'

    default: //MSB, PBC, BAYES - Schools
      return '#17232f'
    }
  }
  getMulti(id) {
    switch (id) {
    case('7034+7004'):
      return 'Sturdee Street'
    case('7036+1315'):
      return 'Victoria Park'
    case('4063+4065+4083+4087+4085+4089'):
      return 'Akoranga Station'
    case('3355+3360+3362+3353'):
      return 'Smales Farm Station'
    case('3221+3219+3238+3240'):
      return 'Sunnynook Station'
    case('4222+4225+4223'):
      return 'Constellation Park & Ride'
    case('4227+4229+4226+4228'):
      return 'Albany Park & Ride'
    default:
      return 'Multi Station'
    }
  }
  // persists data to localStorage
  saveData() {
    localStorage.setItem('StationData', JSON.stringify(this.StationData))
    localStorage.setItem('StationOrder', JSON.stringify(this.StationOrder))
  }
  getData(station) {
    if (typeof station === 'undefined') {
      return this.StationData
    }
    return new Promise((resolve, reject) => {
      if (typeof this.StationData[station] !== 'undefined') {
        return resolve(this.StationData[station])
      } else if (typeof this.stationCache[station] !== 'undefined') {
        return resolve(this.stationCache[station])
      }
      fetch(`/a/nz-akl/station/${station}`).then((response) => {
        response.json().then(resolve)
      }).catch(err => reject(err))
    })
  }
  getOrder() {
    return this.StationOrder
  }
  addStop(stopNumber, stopName) {
    // so we don't have duplicates
    if (typeof(this.StationData[stopNumber]) === 'undefined') {
      this.StationOrder.push(stopNumber)
    }
    var stopNumberReq = stopNumber
    if (stopNumber.split('+').length > 1) {
      stopNumberReq = stopNumber.split('+')[0]
    }
    fetch(`/a/nz-akl/station/${stopNumberReq}`).then((response) => {
      response.json().then((data) => {
        var description = `Stop ${stopNumber} / ${data.stop_name}`
        if (stopNumber.split('+').length > 1) {
          description = 'Northern Busway / ' + this.getMulti(stopNumber)
        }
        this.StationData[stopNumber] = {
          name: stopName,
          stop_lat: data.stop_lat,
          stop_lon: data.stop_lon,
          description: description,
          icon: this.getIcon(stopNumber)
        }
        this.trigger('change')
        this.saveData()
      })
    })
  }
  removeStop(stopNumber) {
    var index = this.StationOrder.indexOf(stopNumber)
    if (index > -1) {
      this.StationOrder.splice(index, 1)
    }
    delete this.StationData[stopNumber]
    this.trigger('change')

    this.saveData()
  }
  getLines() {
    return new Promise((resolve, reject) => {
      if (Object.keys(this.lineCache).length === 0) {
        fetch('/a/nz-akl/lines').then((response)=>{
          response.json().then((data) => {
            this.lineCache = data
            resolve(data)
          })
        }).catch((err) => {
          reject(err)
        })
      } else {
        resolve(this.lineCache)
      }
    })
  }
  getTimes(station) {
    fetch(`/a/nz-akl/station/${station}/times`).then((response) => {
      response.json().then((data) => {
        this.timesFor = [station, new Date()]
        this.tripData = data.trips
        this.realtimeData = data.realtime
        this.trigger('times', station)
      })
    })
  }
  getRealtime(tripData) {
    // realtime request for buses and trains
    // not ferries though
    if (tripData.length === 0 || tripData[0].route_type === '4') {
      return
    }

    const queryString = tripData.filter(function(trip) {
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
    }).map(trip => trip.trip_id)

    // we need to pass an extra param for train trips
    var requestData
    if (tripData[0].route_type === 2) {
      requestData = JSON.stringify({
        trips: queryString,
        train: true
      })
    } else {
      requestData = JSON.stringify({trips: queryString})
    }

    // now we do a request to the realtime API
    fetch('/a/nz-akl/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestData
    }).then((response) => {
      response.json().then((data) => {
        this.realtimeData = data
        this.trigger('realtime')
      })
    })
  }
  getTimetable(station, route, direction) {
    const sortfn = function(a, b) {
      return a.arrival_time_seconds - b.arrival_time_seconds
    }
    return new Promise((resolve, reject) => {
      fetch(`/a/nz-akl/station/${station}/timetable/${route}/${direction}`).then((request) => {
        request.json().then((data) => {
          data.sort(sortfn)
          resolve(data)
        })
      }).catch(reject)
    })
  }
}
export let StationStore = new stationStore()