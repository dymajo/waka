import leaflet from 'leaflet'
const GeoJSON = leaflet.geoJSON

import { UiStore } from '../../stores/uiStore.js'

export class Layer {
  features = []
  visible = false
  show() {
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
  add(type, data) {
    const feature = GeoJSON(data)
    this.features.push(feature)
    if (this.visible === true) {
      feature.addTo(UiStore.basemap)
    }
  }
}
