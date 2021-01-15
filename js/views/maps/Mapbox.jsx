import React, { Component } from 'react'
import mapboxgl from 'mapbox-gl'
import { withRouter } from 'react-router'

import CurrentLocation from '../../stores/CurrentLocation.js'
import SettingsStore from '../../stores/SettingsStore.js'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'
import { vars } from '../../styles.js'

import MapboxStops from './MapboxStops.jsx'
import Layer from './MapboxLayer.jsx'

const { desktopThreshold } = vars

class MapboxMap extends Component {

  zoom = 16.5

  selectedStopLayer = new Layer('selected-stop')

  selectedStopLayerVisible = false

  componentDidMount() {
    CurrentLocation.bind('pinmove', this.pinmove)
    CurrentLocation.bind('mapmove', this.mapmove)
    CurrentLocation.bind('mapmove-silent', this.mapmovesilent)
    UiStore.bind('station-data-available', this.stationDataAvailable)

    this.map = new mapboxgl.Map({
      container: this.mapContainer,
      style: 'mapbox://styles/consindo/ckjtsal580mwi19o1qyebauwv',
      center: SettingsStore.getState().lastLocation.slice().reverse(),
      zoom: this.zoom,
    })
    UiStore.state.basemap = this.map
    this.map.touchPitch.disable()
    this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-left')
    this.map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
      enableHighAccuracy: true
    },
      trackUserLocation: true
    }))

    // waits for both data & map to load before adding to map
    this.loadImages()
    this.stops = new MapboxStops(this.map, this.props.history)
  }

  componentDidUpdate() {
    this.renderSelectedStation()
  }

  stationDataAvailable = () => {
    this.renderSelectedStation()
  }

  renderSelectedStation() {
    const splitName = this.props.history.location.pathname.split('/')
    if (splitName.length === 4 && splitName[1][0] === 's') {
      const currentStation = splitName[3]
      if (this.selectedStopLayerVisible === currentStation) return

      const item = StationStore.stationCache[currentStation]
      if (item === undefined) return
      this.selectedStopLayerVisible = currentStation
    
      const coordinates = [item.stop_lon, item.stop_lat]

      this.map.flyTo({
        center: coordinates,
        zoom: 17.25,
        padding: {
          bottom: document.documentElement.clientWidth <= desktopThreshold ? 350 : 0
        }
      })

      this.selectedStopLayer.hide()
      this.selectedStopLayer.add('geojson', {
        type: 'Point',
        coordinates,
      }, {
        typeExtension: 'VehicleMarker',
        typeExtensionOptions: {
          region: splitName[2],
          route_type: item.route_type,
          size: 1.2,
        }
      })
      this.selectedStopLayer.show(null, true, false)
    } else {
      if (!this.selectedStopLayerVisible) return
      this.selectedStopLayerVisible = false
      this.selectedStopLayer.hide()
    }
  }

  mapmovesilent = () => {
    const position = CurrentLocation.state.position.slice()
    this.map.jumpTo({
      center: position.reverse(),
      zoom: 16.5,
    })
    this.renderSelectedStation()
  }

  loadImages = () => {
    const images = [
      'vehicle-bus',
      'vehicle-train',
      'vehicle-ferry',
      'vehicle-cablecar',
      'vehicle-parkingbuilding',
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
