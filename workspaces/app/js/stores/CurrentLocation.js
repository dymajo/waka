import { vars } from '../styles.js'
import Events from './Events'
import StationStore from './StationStore'
import SettingsStore from './SettingsStore'

const { desktopThreshold } = vars

class CurrentLocation extends Events {
  // ability to subscribe to location updates
  constructor(props) {
    super(props)
    this.geoID = null // geoID has a watcg on the watching of position
    this.state = {
      position: [0, 0], // user's current position
      gpsPosition: [0, 0], // same same but different?
      accuracy: 0, // accuracy in (km?) of user's current position
      timestamp: 0, // what time location was found
      error: '', // if geolocation returned error
      hasGranted: false,
      initialSet: window.location.pathname.split('/')[1] !== 's',
    }
  }

  async componentDidMount() {
    // this only works in chrome & firefox not safari whoops.
    // also, don't do it on desktop
    if ('permissions' in navigator && window.innerWidth <= desktopThreshold) {
      const e = await navigator.permissions.query({ name: 'geolocation' })
      if (e.state === 'granted') {
        this.state.hasGranted = true
      }
    }
  }

  startWatch(updateType = 'pinmove') {
    // use this on page load to start watching poistion
    this.geoID = navigator.geolocation.watchPosition(
      position => {
        // make the geoID watch the position
        this.state.hasGranted = true
        this.setCurrentPosition(position, updateType)

        // can only move the map once
        if (updateType === 'mapmove') {
          updateType = 'pinmove'
        }

        // stops watching geolocation after 20 seconds
        setTimeout(() => {
          this.stopWatch()
        }, 20000)
      },
      error => {
        this.state.error = error.message
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
      }
    )
  }

  stopWatch() {
    // releases watch on geoID
    navigator.geolocation.clearWatch(this.geoID)
    this.geoID = null
  }

  setInitialPosition(lat, lng) {
    if (this.state.initialSet === false) {
      this.state.position = [lat, lng]
      this.trigger('mapmove-silent')
      this.state.initialSet = true
    }
  }

  setCurrentPosition(position, updateType = 'pinmove') {
    const coords = [position.coords.latitude, position.coords.longitude]
    this.state.position = coords
    this.state.gpsPosition = coords
    this.state.accuracy = position.coords.accuracy
    this.state.timestamp = position.timestamp
    this.trigger(updateType)
    requestAnimationFrame(() => {
      SettingsStore.state.lastLocation = coords
      SettingsStore.saveState()
    })
  }

  resetCurrentPosition(updateType = 'pinmove') {
    this.state.position[0] = this.state.gpsPosition[0] + Math.random() / 100000
    this.state.position[1] = this.state.gpsPosition[1] + Math.random() / 100000
    this.trigger(updateType)
  }

  setCity(prefix, position) {
    this.state.position = position
    this.trigger('mapmove-silent')
    StationStore.getCity(...this.state.position)
  }

  currentLocationButton() {
    if (this.geoID === null) {
      this.startWatch('mapmove')
      return
    }
    if (this.state.error === '') {
      // if no error
      this.resetCurrentPosition('mapmove') // move position by a very small random amount
    } else if (this.state.error.toLowerCase() === 'timeout expired') {
      this.resetCurrentPosition('mapmove')
      navigator.geolocation.getCurrentPosition(position => {
        this.state.hasGranted = true
        this.setCurrentPosition(position, 'mapmove')
      })
    } else {
      alert(this.state.error)
    }
  }
}
export default new CurrentLocation()
