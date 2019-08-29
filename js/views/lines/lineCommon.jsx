import { t } from '../../stores/translationStore.js'
import UiStore from '../../stores/UiStore.js'

export const renderShape = async (shape, layer, routeColor) => {
  layer.add('geojson', shape, {
    color: routeColor,
    className: 'metro-line',
    order: 'back',
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
    type: 'MultiPoint',
    coordinates: [],
  }
  const stopsMap = {}
  stops.forEach(stop => {
    geojson.coordinates.push([stop.stop_lon, stop.stop_lat])
    stopsMap[[stop.stop_lat, stop.stop_lon].join(',')] = stop
  })
  pointsLayer.add('geojson', geojson, {
    typeExtension: 'CircleMarker',
    typeExtensionOptions: {
      className: 'metro-dot',
      color: routeColor,
      radius: 4,
    },
    maxZoom: 5,
  })
  pointsLayer.add('geojson', geojson, {
    typeExtension: 'InvisibleMarker',
    typeExtensionOptions: {
      zIndexOffset: 30,
      popupContent: (lat, lng) => {
        const data = stopsMap[[lat, lng].join(',')]
        return (
          // it's not quite react
          `
          <span data-station="${data.stop_id}">
            <h2>${data.stop_name}</h2>
            <h3>${t('vech_loc.stop', { number: data.stop_id })}</h3>
            <button class="leaflet-service-button">
              ${t('vech_loc.services')}
            </button>
          </span>`
        )
      },
      popupOpen: e => {
        const elem = e.popup.getElement()
        const { station } = elem.querySelector('[data-station]').dataset
        const baseUrl = `/s/${region}/${station}`
        const extendedUrl = `${baseUrl}/timetable/${routeShortName}-2`

        elem
          .querySelector('.leaflet-service-button')
          .addEventListener('click', () => {
            UiStore.safePush(baseUrl)
          })
        elem
          .querySelector('.leaflet-timetable-button')
          .addEventListener('click', () => {
            UiStore.safePush(extendedUrl)
          })
      },
    },
  })
  pointsLayer.show()
  return stops
}
