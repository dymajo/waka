import mapboxgl from 'mapbox-gl'

import { t } from '../../stores/translationStore.js'
import UiStore from '../../stores/UiStore.js'

export const renderShape = (shape, layer, routeColor) => {
  layer.add('geojson', shape, {
    orderBefore: 'route-points',
    color: routeColor,
    className: 'metro-line',
  })
  layer.show(shape.bounds, true, false)
  return shape
}

export const renderStops = (
  stops,
  pointsLayer,
  routeColor,
  region,
  routeShortName
) => {
  const geojson = {
    type: 'FeatureCollection',
    features: stops.map(stop => ({
      type: 'Feature',
      properties: {
        id: stop.stop_id,
        name: stop.stop_name,
      },
      geometry: {
        type: 'Point',
        coordinates: [stop.stop_lon, stop.stop_lat],
      },
    })),
  }
  pointsLayer.add('geojson', geojson, {
    orderBefore: 'live-vehicles',
    typeExtension: 'CircleMarker',
    typeExtensionOptions: {
      color: routeColor,
      radius: 3,
      popupContent: e => {
        const coordinates = e.features[0].geometry.coordinates.slice()
        const name = e.features[0].properties.name
        const id = e.features[0].properties.id

        const popup = new mapboxgl.Popup({
          closeButton: false,
          className: 'mapbox-stops-popup',
        })
          .setLngLat(coordinates)
          .setHTML(
            `
            <h2>${name}</h2>
            <h3>${t('vech_loc.stop', { number: id })}</h3>
            <button>${t('vech_loc.services')}</button>
          `
          )

        popup.on('open', e => {
          document
            .querySelector('.mapbox-stops-popup button')
            .addEventListener('click', () => {
              popup.remove()
              UiStore.safePush(`/s/${region}/${id}`)
            })
        })
        popup.addTo(UiStore.state.basemap)
      },
    },
  })
  pointsLayer.show()
  return stops
}
