import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'
import { Header } from '../reusable/header.jsx'
import { Layer } from '../maps/layer.jsx'
import { LineData } from '../../data/lineData.js'

class LineWithoutRouter extends React.Component {
  static propTypes = {
    match: PropTypes.object,
  }
  lineData = new LineData({
    region: this.props.match.params.region,
    line_id: this.props.match.params.line_id,
  })
  layer = new Layer()
  pointsLayer = new Layer()
  state = {
    header: '',
    stops: [],
  }
  constructor(props) {
    super(props)
    if (
      UiStore.state.lastTransition !== 'backward' &&
      UiStore.state.cardPosition === 'max'
    ) {
      requestAnimationFrame(() => {
        UiStore.setCardPosition('default')
      })
    }
  }
  componentDidMount() {
    this.lineData.getMeta().then(metadata => {
      const route_color = metadata[0].route_color
      this.setState({
        header: metadata[0].route_long_name,
      })
      this.lineData.shape_id = metadata[0].shape_id
      this.lineData.getShape().then(shape => {
        this.layer.add('geojson', shape, {
          color: route_color,
          className: 'line',
          order: 'back',
        })
        this.layer.show(shape.bounds, true, false)
      })
      this.lineData.getStops().then(stops => {
        this.setState({ stops: stops })

        const geojson = {
          type: 'MultiPoint',
          coordinates: [],
        }
        this.stopsMap = {}
        stops.forEach(stop => {
          geojson.coordinates.push([stop.stop_lon, stop.stop_lat])
          this.stopsMap[[stop.stop_lat, stop.stop_lon].join(',')] = stop
        })
        this.pointsLayer.add('geojson', geojson, {
          typeExtension: 'CircleMarker',
          typeExtensionOptions: {
            className: 'metro-dot',
            color: route_color,
            radius: 7,
          },
          maxZoom: 5,
        })
        this.pointsLayer.add('geojson', geojson, {
          typeExtension: 'InvisibleMarker',
          typeExtensionOptions: {
            zIndexOffset: 30,
            popupContent: (lat, lng) => {
              const data = this.stopsMap[[lat, lng].join(',')]
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
              const station = elem.querySelector('[data-station]').dataset
                .station
              const line_id = this.props.match.params.line_id
              const region = this.props.match.params.region
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
        this.pointsLayer.show()
      })
    })
  }
  componentWillUnmount() {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
  }
  render() {
    return (
      <View style={styles.wrapper}>
        <Header title={this.state.header} />
        {this.state.stops.map(stop => {
          return (
            <Text key={stop.stop_sequence}>
              {stop.stop_id} - {stop.stop_name}
            </Text>
          )
        })}
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})
const Line = withRouter(LineWithoutRouter)
export { Line }
