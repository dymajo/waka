import { browserHistory } from 'react-router'

declare function require(name: string): any;
let request = require('reqwest')

interface StationItem {
  name: string,
  icon: string,
  description: string,
  stop_lat?: number,
  stop_lon?: number
}
export interface StationMap {
  [name: string]: StationItem
}

export namespace StationStore {
  const trainStations = [
    '0133','0115', // britomart, newmarket
    '0277','0118','0122','0104','0119','0120','0105','0129','0123','0124','0121','0125','0126','0128','0127', // western line
    '0114','0113','0112','0102','0606','0605', // onehunga line
    '0111','0101','0109','0100','0108','0099','0098','0107','0106','0097','0134', // southern line
    '0116','0117','0103','0130','0244','9218' // eastern line
  ]
  // not in any order
  const ferryStations = [
    '9600','9610','9623','9630','9670','9690','9730',
    '9660','9650','9720','9810','9640','9770','9760',
    '9790','9740','9700','9604','9620']
  export function getIcon(station) {
    var icon = 'bus'
    if (trainStations.indexOf(station) != -1) {
      icon = 'train'
    } else if (ferryStations.indexOf(station) != -1) {
      icon = 'ferry'
    }
    return icon
  }
  export function getColor(agency_id, code){
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
        return '#0096d6'

      case 'NZBGW': // NZ Bus - Go West
        return '#08ac54'

      case 'NZBML': // NZ Bus - metrolink
        switch (code) {
          case 'CTY': // City Link
            return '#ef3c34'

          case 'INN': // Inner Link
            return '#41b649'

          case 'OUT': // Outer Link
            return '#f7991c'
          
          default:
            return '#152a85'
        }

      case 'NZBNS': // NZ Bus - North Star
        return '#fcba2e'

      case 'NZBWP': // NZ Bus - Waka Pacific
        return '#0f91ab'

      case 'UE': // Urban Express
        return '#281260'

      case 'BTL': // Birkenhead Transport
        return '#b2975b'

      case 'RTH': // Ritchies
        switch (code) {
          case "NEX": // Northern Express
            //return '#0079c2' official
            return '#0056a9' 
          
          default:
            return '#ff6f2c'
        }

      case 'WBC': // Waiheke Bus Company
        return '#01bdf2'

      case 'EXPNZ': // Explore Waiheke - supposed to be closed?
        return '#ffe81c'

      case 'BFL': // Belaire Ferries
        return '#ffd503'

      case 'ATAPT': // AT Airporter
        return '#f7931d'

      case 'PHH': // Pine Harbour / Sealink
        return '#d92732'

      case '360D': // 360 Discovery
        return '#2756a4'

      case 'ABEXP': //Skybus
        return '#ee3124'

      default: //MSB, PBC, BAYES - Schools
        return '#17232f'
    }
  }
  export function getMulti(id) {
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
  export function getPlatform(id) {
    var mappings = {
      '7034': 'Northbound',
      '7004': 'To City',
      '7036': 'Northbound',
      '1315': 'To City',
      '4063': 'Platform 1',
      '4065': 'Platform 2',
      '4083': 'Platform 3a',
      '4087': 'Platform 3b',
      '4085': 'Platform 4a',
      '4089': 'Platform 4b',
      '3355': 'Platform 1',
      '3360': 'Platform 2',
      '3362': 'Platform 3a',
      '3353': 'Platform 3b',
      '3221': 'Platform 1',
      '3219': 'Platform 2',
      '3238': 'Platform 3a',
      '3240': 'Platform 3b',
      '4222': 'Platform 2',
      '4225': 'Platform 3a',
      '4223': 'Platform 3b',
      '4227': 'Platform 1a',
      '4229': 'Platform 1b',
      '4226': 'Platform 2a',
      '4228': 'Platform 2b'
    }
    return mappings[id]
  }
  let StationData = <StationMap>{}
  if (localStorage.getItem('StationData')) {
    StationData = JSON.parse(localStorage.getItem('StationData'))
  }

  let StationOrder = []
  if (localStorage.getItem('StationOrder')) {
    StationOrder = JSON.parse(localStorage.getItem('StationOrder'))
  }
  // persists data to localStorage
  function saveData() {
    localStorage.setItem('StationData', JSON.stringify(StationData))
    localStorage.setItem('StationOrder', JSON.stringify(StationOrder))
  }
  export function getData() {
    return StationData
  }
  export function getOrder() {
    return StationOrder
  }
  export function addStop(stopNumber, stopName) {
    // so we don't have duplicates
    if (typeof(StationData[stopNumber]) === 'undefined') {
      StationOrder.push(stopNumber)
    }
    var stopNumberReq = stopNumber
    if (stopNumber.split('+').length > 1) {
      stopNumberReq = stopNumber.split('+')[0]
    }
    request(`/a/station/${stopNumberReq}`).then((data) => {
      var description = `Stop ${stopNumber} / ${data.stop_name}`
      if (stopNumber.split('+').length > 1) {
        description = 'Northern Busway / ' + getMulti(stopNumber)
      }
      StationData[stopNumber] = {
        name: stopName,
        stop_lat: data.stop_lat,
        stop_lon: data.stop_lon,
        description: description,
        icon: getIcon(stopNumber)
      }
      StationStore.trigger('change')
      saveData()
    })
  }
  export function removeStop(stopNumber) {
    var index = StationOrder.indexOf(stopNumber)
    if (index > -1) {
      StationOrder.splice(index, 1);
    }
    delete StationData[stopNumber]
    StationStore.trigger('change')

    saveData()
  }
  /* THIS IS NOT VERY TYPESCRIPT */
  // But it's so simple I'll fix it later :)
  export function bind(event, fct){
    this._events = this._events || {};
    this._events[event] = this._events[event] || [];
    this._events[event].push(fct);
  }
  export function unbind(event, fct){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    this._events[event].splice(this._events[event].indexOf(fct), 1);
  }
  export function trigger(event /* , args... */){
    this._events = this._events || {};
    if( event in this._events === false  )  return;
    for(var i = 0; i < this._events[event].length; i++){
      this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }
}