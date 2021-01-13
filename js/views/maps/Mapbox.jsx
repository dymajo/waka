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

  position = [...SettingsStore.getState().lastLocation, this.zoom]

  markers = []

  componentDidMount() {
    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/consindo/ckjtsal580mwi19o1qyebauwv',
      center: SettingsStore.getState().lastLocation.reverse(),
      zoom: this.zoom,
    })
    this.map.touchPitch.disable()
    this.map.on('moveend', this.moveEnd)

    // waits for both data & map to load before adding to map
    const dataLoad = this.getData(...this.position)
    const mapLoad = new Promise((resolve, reject) => {
      this.map.on('load', () => {
        this.setupStops()
        resolve()
      })  
    })
    Promise.all([dataLoad, mapLoad])
      .then(data => this.map.getSource('stops').setData(data[0]))
  }

  setupStops = () => {
    const map = this.map
    map.addSource('stops', {
      'type': 'geojson',
      'data': {
        'type': 'FeatureCollection',
        'features': []
      }
    })
    map.addLayer({
      'id': 'stops',
      'type': 'symbol',
      'source': 'stops',
      'layout': {
        'icon-image': '{icon}',
        'icon-allow-overlap': true
      }
    })
    map.on('click', 'stops', (e) => {
      const { stop_region, stop_id } = e.features[0].properties
      this.viewServices(stop_region, stop_id)
    })
    map.on('mouseenter', 'stops', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'stops', () => {
      map.getCanvas().style.cursor = ''
    })
  }

  viewServices = (region, station) => {
    const { history } = this.props
    const split = history.location.pathname.split('/')
    const currentStation = `/s/${region}/${station}`
    if (split[1] === 's' && split.length === 4) {
      history.replace(currentStation)
    } else {
      history.push(currentStation)
    }
  }

  async getData(lat, lon, zoom) {
    const dist = getDist(zoom)
    this.position = [lat, lon, dist]

    if (zoom <= 14) {
      return {
        'type': 'FeatureCollection',
        'features': []
      }
    }

    try {
      const res = await fetch(
        `${local.endpoint}/auto/station/search?lat=${lat.toFixed(
          4
        )}&lon=${lon.toFixed(4)}&distance=${dist}`
      )
      const data = await res.json()
      const features = data.map(stop => ({
        type: 'Feature',
        properties: {
          stop_region: stop.stop_region,
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
          route_type: stop.route_type,
          icon: 'bus'
        },
        'geometry': {
          'type': 'Point',
          'coordinates': [stop.stop_lon, stop.stop_lat]
        }
      }))
      return {
        'type': 'FeatureCollection',
        'features': features
      }
    } catch (error) {
      console.log(error)
    }
  }

  moveEnd = () => {
    const center = this.map.getCenter()
    const zoom = this.map.getZoom()
    this.getData(center.lat, center.lng, zoom)
      .then(data => this.map.getSource('stops').setData(data))
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
