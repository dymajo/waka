import { t } from '../../stores/translationStore.js'
import { UiStore } from '../../stores/uiStore.js'

export const renderShape = function(lineData, layer, routeColor) {
  return lineData.getShape().then(shape => {
    layer.add('geojson', shape, {
      color: routeColor,
      className: 'metro-line',
      order: 'back',
    })
    layer.show(shape.bounds, true, false)
  })
}

export const renderStops = function(
  lineData,
  pointsLayer,
  routeColor,
  region,
  line_id
) {
  return lineData.getStops().then(stops => {
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
            <button class="leaflet-timetable-button timetable-button">
              ${t('vech_loc.timetable')}
            </button>
          </span>`
          )
        },
        popupOpen: e => {
          const elem = e.popup.getElement()
          const station = elem.querySelector('[data-station]').dataset.station
          const baseUrl = `/s/${region}/${station}`
          const extendedUrl = `${baseUrl}/timetable/${line_id}-2`

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
  })
}
