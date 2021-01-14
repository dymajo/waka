import React, { Component } from 'react'
import mapboxgl from 'mapbox-gl'
import { withRouter } from 'react-router'

import SettingsStore from '../../stores/SettingsStore.js'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'

import MapboxStops from './MapboxStops.jsx'

mapboxgl.accessToken = ''

class MapboxMap extends Component {

  zoom = 16.5

  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/consindo/ckjtsal580mwi19o1qyebauwv',
      center: SettingsStore.getState().lastLocation.slice().reverse(),
      zoom: this.zoom,
    })
    UiStore.state.basemap = this.map
    this.map.touchPitch.disable()

    // waits for both data & map to load before adding to map
    this.loadImages()
    this.stops = new MapboxStops(this.map, this.props.history)
  }

  componentDidUpdate() {
    console.log(this.props.history)
    const splitName = this.props.history.location.pathname.split('/')
    if (splitName.length === 4 && splitName[1][0] === 's') {
      console.log('show route icon')
    } else {
      console.log('hide route icon')
    }
  }

  loadImages = () => {
    const images = [
      'vehicle-bus',
      'vehicle-train',
      'vehicle-ferry',
      'vehicle-cablecar',
    ]
    images.forEach(id => {
      this.map.loadImage(`/icons/normal/${id}.png`, (err, image) => {
        if (err) return console.error(err)
        this.map.addImage(`normal-${id}`, image, { pixelRatio: 2 })
      })
    })
  }

  render() {
    return (
      <div className="search">
        <div ref={el => this.mapContainer = el} />
      </div>
    )
  }
}
export default withRouter(MapboxMap)
