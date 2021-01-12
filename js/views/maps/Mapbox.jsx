import React, { Component } from 'react'
import mapboxgl from 'mapbox-gl'
import { withRouter } from 'react-router'

import local from '../../../local'
import SettingsStore from '../../stores/SettingsStore.js'
import StationStore from '../../stores/StationStore.js'

import { getDist } from './util.jsx'

mapboxgl.accessToken = ''

class MapboxMap extends Component {

  zoom = 17

  position = [...SettingsStore.getState().lastLocation, getDist(this.zoom)]

  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/consindo/ckjtsal580mwi19o1qyebauwv',
      center: SettingsStore.getState().lastLocation.reverse(),
      zoom: this.zoom,
    })
    this.map.touchPitch.disable()
    this.getData(...this.position)
  }

  async getData(lat, lon, dist) {
    this.position = [lat, lon, dist]
    try {
      const res = await fetch(
        `${local.endpoint}/auto/station/search?lat=${lat.toFixed(
          4
        )}&lon=${lon.toFixed(4)}&distance=${dist}`
      )
      const data = await res.json()
      data.forEach(stop => {
        new mapboxgl.Marker()
          .setLngLat([stop.stop_lon, stop.stop_lat])
          .addTo(this.map)
      })
    } catch (error) {
      console.log(error)
    }
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
