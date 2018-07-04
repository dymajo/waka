import leaflet from 'leaflet'
const GeoJSON = leaflet.geoJSON
const DivIcon = leaflet.divIcon
const Marker = leaflet.marker
const CircleMarker = leaflet.circleMarker

import { UiStore } from '../../stores/uiStore.js'

export class Layer {
  features = []
  visible = false
  show(bounds = null, dispose = true, hideStops = true, maxZoom = -1) {
    if (bounds !== null) {
      const options = {}
      if (document.documentElement.clientWidth <= 850) {
        options.paddingBottomRight = [0, 350]
      }
      UiStore.basemap.fitBounds(
        [[bounds.lat_min, bounds.lon_min], [bounds.lat_max, bounds.lon_max]],
        options
      )
    }
    if (this.visible === true) return
    if (maxZoom > -1 && dispose === true) {
      this.maxZoom = maxZoom
      UiStore.basemap.on('zoomend', this.toggleOnZoom)
      return this.toggleOnZoom()
    }
    this.visible = true
    this.features.forEach(feature => {
      feature.addTo(UiStore.basemap)
    })
    if (hideStops) {
      UiStore.stopVisibility(hideStops)
    }
  }
  hide(dispose = true, hideStops = false) {
    if (this.visible === false) return
    if (this.maxZoom > -1 && dispose === true) {
      UiStore.basemap.off('zoomend', this.toggleOnZoom)
    }
    this.visible = false
    this.features.forEach(feature => {
      feature.remove(UiStore.basemap)
    })
    if (!hideStops) {
      UiStore.stopVisibility(hideStops)
    }
  }
  toggleOnZoom = () => {
    // this is pretty primative. need some way of checking the spacing between items
    if (this.maxZoom <= UiStore.basemap.getZoom()) {
      this.show(null, false)
    } else {
      this.hide(null, false)
    }
  }
  add(type, data, props = {}) {
    let feature = null
    if (type === 'geojson') {
      if (props.typeExtension === 'CircleMarker') {
        props.pointToLayer = function(feature, latlng) {
          return CircleMarker(latlng, props.typeExtensionOptions)
        }
      } else if (props.typeExtension === 'InvisibleMarker') {
        const divIcon = DivIcon({
          iconSize: [48, 48],
          className: 'invisible-icon',
        })
        props.typeExtensionOptions.icon = divIcon
        if (props.typeExtensionOptions.popupContent) {
          props.pointToLayer = function(feature, latlng) {
            const marker = Marker(latlng, props.typeExtensionOptions).bindPopup(
              props.typeExtensionOptions.popupContent(latlng.lat, latlng.lng)
            )
            marker.addEventListener(
              'popupopen',
              props.typeExtensionOptions.popupOpen
            )
            return marker
          }
        } else {
          props.pointToLayer = function(feature, latlng) {
            return Marker(latlng, props.typeExtensionOptions)
          }
        }
      }
      feature = GeoJSON(data, props)
    }
    if (feature !== null) {
      this.features.push(feature)
      if (this.visible === true) {
        feature.addTo(UiStore.basemap)
      }
      if (props.order === 'back') {
        feature.getLayers().forEach(i => {
          requestAnimationFrame(() => i.bringToBack())
        })
      } else if (props.order === 'front') {
        feature.getLayers().forEach(i => {
          requestAnimationFrame(() => i.bringToFront())
        })
      }
    }
  }
}
