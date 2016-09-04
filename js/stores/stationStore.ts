import { browserHistory } from 'react-router'

declare function require(name: string): any;
let request = require('reqwest')

interface StationItem {
  name: string,
  icon: string,
  description: string 
}
export interface StationMap {
  [name: string]: StationItem
}

export namespace StationStore {
  export const trainStations = [
    '0133','0115', // britomart, newmarket
    '0277','0118','0122','0104','0119','0120','0105','0129','0123','0124','0121','0125','0126','0128','0127', // western line
    '0114','0113','0112','0102','0606','0605', // onehunga line
    '0111','0101','0109','0100','0108','0099','0098','0107','0106','0097','0134', // southern line
    '0116','0117','0103','0130','0244','9218' // eastern line
  ]
  // not in any order
  export const ferryStations = [
    '9600','9610','9623','9630','9670','9690','9730',
    '9660','9650','9720','9810','9640','9770','9760',
    '9790','9740','9700']
  let StationData = <StationMap>{
    '8439': {
      name: 'Youth Street',
      icon: 'bus',
      description: 'Stop 8439 / 1153 Dominion Road'
    },
    '0133': {
      name: 'Britomart',
      icon: 'train',
      description: 'Britomart Train Station, Auckland Central'
    },
    '7058': {
      name: 'Civic',
      icon: 'bus',
      description: 'Stop 7058 / Queen Street outside St James'
    },
    '7056': {
      name: 'Civic Express',
      icon: 'bus',
      description: 'Stop 7056 / Queen Street outside St James'
    },
    '9630': {
      name: 'Downtown Ferry Terminal',
      icon: 'ferry',
      description: 'To Devonport'
    },
    '7148': {
      name: 'Upper Symonds',
      icon: 'bus',
      description: 'Stop 7148 / 36 Symonds Street'
    }
  }
  let StationOrder = ['8439','0133','7058','7056','9630','7148']
  export function getData() {
    return StationData
  }
  export function getOrder() {
    return StationOrder
  }
  export function addStop(stopNumber) {
    // so we don't have duplicates
    if (typeof(StationData[stopNumber]) === 'undefined') {
      StationOrder.push(stopNumber)
    }
    request(`/a/station/${stopNumber}`).then((data) => {
      console.log(data)
      StationData[stopNumber] = {
        name: data.stop_name,
        description: `Stop ${stopNumber} / ${data.stop_name}`,
        icon: 'bus'
      }
      StationStore.trigger('change')
      browserHistory.push(`/s/${stopNumber}`)
    })
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