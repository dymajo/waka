import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import leaflet from 'leaflet'
import { withRouter } from 'react-router'
import queryString from 'query-string'
import { vars } from '../../styles.js'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'

import Layer from '../maps/Layer.jsx'
import LineData from '../../data/LineData.js'
import LineStops from './LineStops.jsx'
import { renderShape, renderStops } from './lineCommon.jsx'
import IconHelper from '../../helpers/icons/index.js'

const Icon = leaflet.icon
const icons = new Map([
  [
    'train',
    Icon({
      iconUrl: '/icons/normal/train-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    'bus',
    Icon({
      iconUrl: '/icons/normal/bus-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    'cablecar',
    Icon({
      iconUrl: '/icons/normal/cablecar-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    4,
    'ferry',
    Icon({
      iconUrl: '/icons/normal/ferry-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
])

let styles = null

class Line extends React.Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
  }

  layer = new Layer()

  pointsLayer = new Layer()

  liveLayer = new Layer()

  iconHelper = new IconHelper()

  state = {
    color: '#666',
    stops: [],
    lineMetadata: [],
    loading: true,
  }

  constructor(props) {
    super(props)

    const { match, location } = this.props

    const parsed = queryString.parse(location.search)
    this.lineData = new LineData({
      region: match.params.region,
      route_short_name: match.params.route_short_name,
      agency_id: match.params.agency_id,
      route_id: parsed.route_id || null,
      stop_id: parsed.stop_id || null,
      direction_id: parsed.direction === '1' ? 1 : 0,
    })

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
    this.dataResolved = this.getData()
    this.getTimetable()
    this.getPositionData()

    this.liveRefresh = setInterval(() => {
      this.getPositionData()
    }, 10000)
  }

  componentWillUnmount() {
    this.layer.hide(true, true)
    this.pointsLayer.hide()
    this.liveLayer.hide()
    this.layer.unmounted = true
    this.pointsLayer.unmounted = true
    this.liveLayer.unmounted = true

    clearInterval(this.liveRefresh)
    this.cancelCallbacks = true
  }

  async getData() {
    try {
      const metadata = await this.lineData.getMeta()

      if (metadata.length === 0) {
        throw new Error('The line was not found.')
      } else if (metadata[0].shape_id === null) {
        throw new Error('The line had missing data.')
      }

      const { match } = this.props
      const route = metadata.find(
        i => i.direction_id === this.lineData.direction_id
      )

      this.setState({
        color: route.route_color,
        lineMetadata: metadata,
      })

      // Render the shape
      this.lineData.shape_id = route.shape_id

      // we don't want to await this, so the data loads async
      this.lineData
        .getShape()
        .then(shape => renderShape(shape, this.layer, route.route_color)) // eslint-disable-line promise/prefer-await-to-then
        .catch(err => console.err)

      const stops = await this.lineData.getStops()
      const renderedStops = renderStops(
        stops,
        this.pointsLayer,
        route.route_color,
        match.params.region,
        match.params.route_short_name
      )
      this.setState({ stops: renderedStops, loading: false })

      // if the stop wasn't specified in the URL
      if (this.lineData.stop_id === null && stops.length > 0) {
        this.lineData.stop_id = stops[0].stop_id
        this.getTimetable()
      }
    } catch (err) {
      clearInterval(this.liveRefresh)
      console.error(err)
      this.setState({
        error: true,
        errorMessage: err.message,
      })
    }
  }

  getTimetable = async () => {
    try {
      const timetableData = await this.lineData.getTimetable()
      console.log('timetable data', timetableData)
    } catch (err) {
      // cannot get timetable, usually because the stop_id is undefined
    }
  }

  getPositionData = async () => {
    let busPositions = null
    try {
      const data = await this.lineData.getRealtime()
      this.liveLayer.hide()
      this.liveLayer = new Layer()
      busPositions = {
        type: 'MultiPoint',
        coordinates: [],
      }
      data.forEach(trip => {
        if (
          trip.latitude !== undefined &&
          trip.direction === this.lineData.direction_id
        ) {
          busPositions.coordinates.push([
            trip.longitude,
            trip.latitude,
            // TODO: bearing
          ])
        }
      })

      // this makes sure the route data has been loaded.
      await this.dataResolved
      const { lineMetadata } = this.state
      const icon = icons.get(
        this.iconHelper.getRouteType(lineMetadata[0].route_type)
      )
      this.liveLayer.add('geojson', busPositions, {
        icon,
      })
      if (this.cancelCallbacks === true) return 'cancelled'
      this.liveLayer.show()
      return 'done'
    } catch (err) {
      console.error(err)
    }
  }

  render() {
    const { match } = this.props
    const {
      color,
      error,
      errorMessage,
      lineMetadata,
      loading,
      stops,
    } = this.state

    const currentLine =
      lineMetadata.length > 0
        ? lineMetadata.length === 1
          ? lineMetadata[0]
          : lineMetadata.find(
              i => i.direction_id === this.lineData.direction_id
            )
        : {}
    let lineLabel = null
    if (lineMetadata.length <= 1) {
      lineLabel = 'Route Stations'
    } else {
      lineLabel = StationStore.getDirection(
        match.params.region,
        currentLine.direction_id
      )
    }
    if (error) {
      return (
        <View style={styles.wrapper}>
          <Header title="Line Error" />
          <View style={styles.error}>
            <Text style={styles.errorMessage}>
              We couldn&apos;t load the {match.params.route_short_name} line in{' '}
              {match.params.region}.
            </Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        </View>
      )
    }

    const inner = loading ? (
      <div className="spinner" />
    ) : (
      <React.Fragment>
        <Text style={styles.direction}>{lineLabel}</Text>
        <LineStops
          color={color}
          stops={stops}
          line={match.params.route_short_name}
          region={match.params.region}
        />
      </React.Fragment>
    )

    return (
      <View style={styles.wrapper}>
        <Header
          title={match.params.route_short_name}
          subtitle={currentLine.route_long_name || ''}
        />
        <LinkedScroll>{inner}</LinkedScroll>
      </View>
    )
  }
}

styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  direction: {
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingBottom: vars.padding * 0.5,
    fontWeight: '600',
    fontSize: vars.defaultFontSize,
    fontFamily: vars.fontFamily,
  },
  error: {
    padding: vars.padding,
  },
  errorMessage: {
    fontSize: vars.defaultFontSize,
    fontFamily: vars.fontFamily,
  },
})
export default withRouter(Line)
