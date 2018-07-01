import leaflet from 'leaflet'
const GeoJSON = leaflet.geoJSON

import { UiStore } from '../../stores/uiStore.js'

export class Layer {
  features = []
  visible = false
  show(bounds = null) {
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
    this.visible = true
    this.features.forEach(feature => {
      feature.addTo(UiStore.basemap)
    })
  }
  hide() {
    if (this.visible === false) return
    this.visible = false
    this.features.forEach(feature => {
      feature.remove(UiStore.basemap)
    })
  }
  add(type, data, props = {}) {
    const feature = GeoJSON(data, props)
    this.features.push(feature)
    if (this.visible === true) {
      feature.addTo(UiStore.basemap)
    }
  }
}
