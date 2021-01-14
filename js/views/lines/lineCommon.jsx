import { t } from '../../stores/translationStore.js'
import UiStore from '../../stores/UiStore.js'

export const renderShape = (shape, layer, routeColor) => {
  layer.add('geojson', shape, {
    orderBefore: 'route-points',
    color: routeColor,
    className: 'metro-line'
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
    orderBefore: 'live-vehicles',
    typeExtension: 'CircleMarker',
    typeExtensionOptions: {
      color: routeColor,
      radius: 3,
    },
    maxZoom: 5,
  })
  // pointsLayer.add('geojson', geojson, {
  //   typeExtension: 'InvisibleMarker',
  //   typeExtensionOptions: {
  //     zIndexOffset: 30,
  //     popupContent: (lat, lng) => {
  //       const data = stopsMap[[lat, lng].join(',')]
  //       return (
  //         // it's not quite react
  //         `
  //         <span data-station="${data.stop_id}">
  //           <h2>${data.stop_name}</h2>
  //           <h3>${t('vech_loc.stop', { number: data.stop_id })}</h3>
  //           <button class="leaflet-service-button">
  //             ${t('vech_loc.services')}
  //           </button>
  //         </span>`
  //       )
  //     },
  //     popupOpen: e => {
  //       const elem = e.popup.getElement()
  //       const { station } = elem.querySelector('[data-station]').dataset
  //       const baseUrl = `/s/${region}/${station}`
  //       const extendedUrl = `${baseUrl}/timetable/${routeShortName}-2`

  //       elem
  //         .querySelector('.leaflet-service-button')
  //         .addEventListener('click', () => {
  //           UiStore.safePush(baseUrl)
  //         })
  //       elem
  //         .querySelector('.leaflet-timetable-button')
  //         .addEventListener('click', () => {
  //           UiStore.safePush(extendedUrl)
  //         })
  //     },
  //   },
  // })
  pointsLayer.show()
  return stops
}
