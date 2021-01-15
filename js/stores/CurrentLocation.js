import Events from './Events'
import StationStore from './StationStore'

class CurrentLocation extends Events {
  // ability to subscribe to location updates
  constructor(props) {
    super(props)
    this.state = {
      position: [0, 0], // user's current position
      initialSet: window.location.pathname.split('/')[1] !== 's',
    }
  }

  setInitialPosition(lat, lng) {
    if (this.state.initialSet === false) {
      this.state.position = [lat, lng]
      this.trigger('mapmove-silent')
      this.state.initialSet = true
    }
  }

  setCity(prefix, position) {
    this.state.position = position
    this.trigger('mapmove-silent')
    StationStore.getCity(...this.state.position)
  }
}
export default new CurrentLocation()
