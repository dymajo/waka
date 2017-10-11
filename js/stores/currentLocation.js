import Events from './events'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'

export class currentLocation extends Events { // ability to subscribe to location updates
  constructor(props) {
    super(props)
    this.geoID = null  // geoID has a watcg on the watching of position
    this.state = {
      position: [0,0], // user's current position
      accuracy: 0, // accuracy in (km?) of user's current position
      timestamp: 0, // what time location was found
      error: '', // if geolocation returned error
      hasGranted: false
    }
    // this only works in chrome & firefox not safari whoops.
    if ('permissions' in navigator) {
      navigator.permissions.query({name:'geolocation'}).then(e => {
        if (e.state === 'granted') {
          this.state.hasGranted = true
        }
      })
    }
  }
  startWatch() { // use this on page load to start watching poistion
    this.geoID = navigator.geolocation.watchPosition((position) => { // make the geoID watch the position
      this.state.hasGranted = true
      if (this.state.position[0] === 0){ // if there's no current location loaded
        // settings for auckland only
        // TODO ENSURE WELLINGTON
        if (this.state.position[0] > -38 && this.state.position[0] < -36 && this.state.position[1] > 173 && this.state.position[1] < 175) {
          this.resetCurrentPosition()
        } else {
          this.setCurrentPosition(position)
        }
      } else {
        this.setCurrentPosition(position)
      }
    }, (error) => {
      this.state.error = error.message
    }, {
      enableHighAccuracy: true,
      timeout: 5000
    })
  }

  stopWatch() { // releases watch on geoID
    navigator.geolocation.clearWatch(this.geoID)
    this.geoID = null
  }

  setCurrentPosition(position, updateType = 'pinmove') {
    let coords = [position.coords.latitude, position.coords.longitude]
    this.state.position = coords
    this.state.accuracy = position.coords.accuracy
    this.state.timestamp = position.timestamp
    this.trigger(updateType)
    requestAnimationFrame(() => {
      SettingsStore.state.lastLocation = coords
      SettingsStore.saveState()
    })
  }

  resetCurrentPosition(updateType = 'pinmove') {
    this.state.position[0] += Math.random()/100000
    this.state.position[1] += Math.random()/100000
    this.trigger(updateType)
  }

  setCity(prefix) {
    if (prefix === 'nz-akl') {
      this.state.position = [-36.844229, 174.767823] // britomart
    } else if (prefix === 'nz-wlg') {
      this.state.position = [-41.278366, 174.779359] // wellington station
    }
    this.trigger('mapmove-silent')
    StationStore.getCity(...this.state.position)
  }

  currentLocationButton() {
    if (this.geoID === null) {
      this.startWatch()
      return
    }
    if (this.state.error === '') { // if no error 
      this.resetCurrentPosition('mapmove') // move position by a very small random amount
    } else {
      if (this.state.error.toLowerCase() === 'timeout expired') {
        navigator.geolocation.getCurrentPosition((position) => {
          this.state.hasGranted = true
          this.setCurrentPosition(position, 'mapmove')
        })
      } else {
        alert(this.state.error)
      }
    }
  }
}
export let CurrentLocation = new currentLocation()