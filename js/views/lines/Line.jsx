import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import leaflet from 'leaflet'
import { withRouter } from 'react-router'

import local from '../../../local.js'
import { vars } from '../../styles.js'
import StationStore from '../../stores/StationStore.js'
import UiStore from '../../stores/UiStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import LinkButton from '../reusable/LinkButton.jsx'

import Layer from '../maps/Layer.jsx'
import LineData from '../../data/LineData.js'
import LineStops from './LineStops.jsx'
import { renderShape, renderStops } from './lineCommon.jsx'

const Icon = leaflet.icon
const icons = [
  null,
  null,
  Icon({
    iconUrl: '/icons/normal/train-fill.svg',
    iconSize: [24, 24],
    className: 'vehIcon',
  }),
  Icon({
    iconUrl: '/icons/normal/bus-fill.svg',
    iconSize: [24, 24],
    className: 'vehIcon',
  }),
  Icon({
    iconUrl: '/icons/normal/ferry-fill.svg',
    iconSize: [24, 24],
    className: 'vehIcon',
  }),
]

let styles = null

class Line extends React.Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
  }

  layer = new Layer()

  pointsLayer = new Layer()

  liveLayer = new Layer()

  state = {
    color: '#666',
    stops: [],
    direction: 0,
    lineMetadata: [],
    loading: true,
  }

  constructor(props) {
    super(props)

    const { match, location } = this.props

    // sets the direction
    if (location.search !== '') {
      const direction = location.search.split('?direction=')[1]
      if (direction === '1') {
        this.state.direction = 1
      }
    }

    this.lineData = new LineData({
      region: match.params.region,
      line_id: match.params.line_id,
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

  getData() {
    return this.lineData
      .getMeta()

      .then(metadata => {
        if (metadata.length === 0) {
          throw new Error('The line was not found.')
        } else if (metadata[0].shape_id === null) {
          throw new Error('The line had missing data.')
        }
        const { match } = this.props
        const { direction } = this.state
        const routeColor = metadata.find(i => i.direction_id === direction)
          .route_color
        this.setState({
          color: routeColor,
          lineMetadata: metadata,
        })
        this.lineData.shape_id = metadata.find(
          i => i.direction_id === direction
        ).shape_id
        renderShape(this.lineData, this.layer, routeColor)

        return renderStops(
          this.lineData,
          this.pointsLayer,
          routeColor,
          match.params.region,
          match.params.line_id
        )
      })
      .then(stops => {
        this.setState({ stops, loading: false })
        return stops
      })
      .catch(err => {
        clearInterval(this.liveRefresh)
        console.error(err)
        this.setState({
          error: true,
          errorMessage: err.message,
        })
      })
  }

  getPositionData = () => {
    const { match } = this.props
    const { direction } = this.state
    let busPositions = null
    this.lineData
      .getRealtime()
      .then(data => {
        this.liveLayer.hide()
        this.liveLayer = new Layer()
        busPositions = {
          type: 'MultiPoint',
          coordinates: [],
        }
        data.forEach(trip => {
          if (trip.latitude !== undefined && trip.direction === direction) {
            busPositions.coordinates.push([
              trip.longitude,
              trip.latitude,
              // TODO: bearing
            ])
          }
        })

        // this makes sure the route data has been loaded.
        return this.dataResolved
      })
      .then(() => {
        const { lineMetadata } = this.state
        this.liveLayer.add('geojson', busPositions, {
          icon: icons[lineMetadata[0].route_type],
        })
        if (this.cancelCallbacks === true) return 'cancelled'
        this.liveLayer.show()
        return 'done'
      })
      .catch(err => {
        // who cares about the error
        console.error('Could not load realtime.')
      })
  }

  triggerSwitchDirection = () => {
    const { direction } = this.state
    this.layer.hide(true, true)
    this.pointsLayer.hide()
    this.liveLayer.hide()
    this.layer = new Layer()
    this.pointsLayer = new Layer()
    this.setState(
      {
        direction: !direction ? 1 : 0,
        loading: true,
      },
      () => {
        this.getPositionData()
      }
    )
    this.getData()
  }

  render() {
    const { match } = this.props
    const {
      color,
      direction,
      error,
      errorMessage,
      lineMetadata,
      loading,
      stops,
    } = this.state

    const currentLine =
      lineMetadata.length > 0
        ? lineMetadata.find(i => i.direction_id === direction)
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
              We couldn&apos;t load the {match.params.line_id} line in{' '}
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
          line={match.params.line_id}
          region={match.params.region}
        />
        <View style={styles.linkWrapper}>
          {lineMetadata.length <= 1 ? null : (
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
          title={match.params.line_id}
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
    fontFamily: vars.defaultFontFamily,
  },
  linkWrapper: {
    padding: vars.padding,
  },
  error: {
    padding: vars.padding,
  },
  errorMessage: {
    fontSize: vars.defaultFontSize,
    fontFamily: vars.defaultFontFamily,
  },
})
export default withRouter(Line)
