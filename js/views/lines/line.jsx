import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import { vars } from '../../styles.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'
import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'
import { LinkButton } from '../reusable/linkButton.jsx'
import { Layer } from '../maps/layer.jsx'
import { LineData } from '../../data/lineData.js'
import { LineStops } from './lineStops.jsx'

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
    color: '#666',
    stops: [],
    direction: 0,
    lineMetadata: [],
    loading: true,
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
  triggerSwitchDirection = () => {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
    this.layer = new Layer()
    this.pointsLayer = new Layer()
    this.setState({
      direction: !this.state.direction ? 1 : 0,
      loading: true,
    })
    this.getData()
  }
  componentDidMount() {
    this.getData()
  }
  getData() {
    this.lineData.getMeta().then(metadata => {
      const route_color = metadata[this.state.direction].route_color
      this.setState({
        color: route_color,
        lineMetadata: metadata,
      })
      this.lineData.shape_id = metadata[this.state.direction].shape_id
      this.lineData.getShape().then(shape => {
        this.layer.add('geojson', shape, {
          color: route_color,
          className: 'metro-line',
          order: 'back',
        })
        this.layer.show(shape.bounds, true, false)
      })
      this.lineData.getStops().then(stops => {
        this.setState({ stops: stops, loading: false })

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
            radius: 4,
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
    const currentLine =
      this.state.lineMetadata.length > 0
        ? this.state.lineMetadata[this.state.direction]
        : {}
    const inner = this.state.loading ? (
      <div className="spinner" />
    ) : (
      <React.Fragment>
        <Text style={styles.direction}>
          {this.state.lineMetadata.length <= 1
            ? 'Route Stations'
            : StationStore.getDirection(
                this.props.match.params.region,
                currentLine.direction_id
              ) + ' Route'}
        </Text>
        <LineStops
          color={this.state.color}
          stops={this.state.stops}
          line={this.props.match.params.line_id}
          region={this.props.match.params.region}
        />
        <View style={styles.linkWrapper}>
          {this.state.lineMetadata.length <= 1 ? null : (
            <LinkButton
              label="Change Direction"
              color="secondary"
              onClick={this.triggerSwitchDirection}
            />
          )}
        </View>
      </React.Fragment>
    )

    return (
      <View style={styles.wrapper}>
        <Header
          title={this.props.match.params.line_id}
          subtitle={currentLine.route_long_name || ''}
        />
        <LinkedScroll>{inner}</LinkedScroll>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  direction: {
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingBottom: vars.padding * 0.5,
    fontWeight: '600',
    fontSize: vars.defaultFontSize,
    fontFamily: vars.defaultFontFamily,
  },
  linkWrapper: {
    padding: vars.padding,
  },
})
const Line = withRouter(LineWithoutRouter)
export { Line }
