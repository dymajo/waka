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