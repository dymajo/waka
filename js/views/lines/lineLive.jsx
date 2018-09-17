import React from 'react'
import PropTypes from 'prop-types'
import { View, Text, StyleSheet } from 'react-native'
import { withRouter } from 'react-router'

import local from '../../../local.js'
import { vars } from '../../styles.js'
import { StationStore } from '../../stores/stationStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { Header } from '../reusable/header.jsx'
import { LinkedScroll } from '../reusable/linkedScroll.jsx'

import { Layer } from '../maps/layer.jsx'
import { LineData } from '../../data/lineData.js'
import { LineStops } from './lineStops.jsx'
import { renderShape, renderStops } from './lineCommon.jsx'

import leaflet from 'leaflet'
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

class LiveLineWithoutRouter extends React.Component {
  static propTypes = {
    match: PropTypes.object,
  }
  cancelCallbacks = false
  requestingRealtime = false
  lineData = new LineData({
    region: this.props.match.params.region,
  })
  layer = new Layer()
  pointsLayer = new Layer()
  liveLayer = new Layer()
  state = {
    header: '',
    stops: [],
    direction: 0,
    lineMetadata: [],
    loading: true,
    noMatch: false,
    tripInfo: {},
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
    this.getData()
    this.liveRefresh = setInterval(() => {
      this.getPositionData()
    }, 10000)
  }
  getData() {
    const station = this.props.match.params.station
    const region = this.props.match.params.region
    const targetId = this.props.match.params.trip_id
    let info = StationStore.tripData.find(item => item.trip_id === targetId)
    if (!info) {
      StationStore.getTimes(station, region).then(() => {
        info = StationStore.tripData.find(item => item.trip_id === targetId)
        if (!info) {
          this.setState({
            noMatch: true,
          })
        } else {
          this.setState({ tripInfo: info }, () => {
            this.getShape(
              info.shape_id,
              info.route_color,
              info.route_short_name
            )
          })
        }
      })
    } else {
      this.setState({ tripInfo: info }, () => {
        this.getShape(info.shape_id, info.route_color, info.route_short_name)
      })
    }
  }
  getShape(shape_id, route_color, line_id) {
    this.lineData.shape_id = shape_id
    renderShape(this.lineData, this.layer, route_color)
    renderStops(
      this.lineData,
      this.pointsLayer,
      route_color,
      this.props.match.params.region,
      line_id
    ).then(stops => {
      if (this.cancelCallbacks) {
        return
      }
      this.setState({ stops: stops, loading: false })
    })

    if (Object.keys(StationStore.realtimeData).length > 0) {
      this.getPositionData()
    } else {
      StationStore.getRealtime(
        StationStore.tripData,
        this.props.match.params.station,
        this.props.match.params.region
      ).then(() => {
        this.getPositionData()
      })
    }
  }
  getPositionData = () => {
    const trips = StationStore.tripData
    const realtime = StationStore.realtimeData
    const realtimeKeys = Object.keys(realtime)
    if (realtimeKeys.length > 0) {
      const tripsHashTable = {}
      trips.forEach(function(trip) {
        tripsHashTable[trip.trip_id] = trip.route_long_name
      })
      const queryString = realtimeKeys.filter(trip => {
        return tripsHashTable[trip] === this.state.tripInfo.route_long_name
      })
      const requestData = JSON.stringify({ trips: queryString })
      if (queryString.length === 0) {
        return
      }
      this.requestingRealtime = true
      fetch(
        `${local.endpoint}/${this.props.match.params.region}/vehicle_location`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestData,
        }
      ).then(response => {
        this.requestingRealtime = false
        response.json().then(data => {
          if (this.cancelCallbacks) {
            return
          }
          this.liveLayer.hide()
          this.liveLayer = new Layer()
          const busPositions = {
            type: 'MultiPoint',
            coordinates: [],
          }
          for (const trip in data) {
            if (typeof data[trip].latitude !== 'undefined') {
              busPositions.coordinates.push([
                data[trip].longitude,
                data[trip].latitude,
                // TODO: bearing
              ])
            }
          }
          this.liveLayer.add('geojson', busPositions, {
            icon: icons[this.state.tripInfo.route_type],
          })
          this.liveLayer.show()
        })
      })
    }
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
  render() {
    const inner = this.state.loading ? (
      <div className="spinner" />
    ) : this.state.noMatch ? (
      <View>
        <Text style={styles.direction}>This service could not be found.</Text>
      </View>
    ) : (
      <React.Fragment>
        <Text style={styles.direction}>Stations</Text>
        <LineStops
          color={this.state.tripInfo.route_color}
          stops={this.state.stops}
          line={this.state.tripInfo.route_short_name}
          region={this.props.match.params.region}
        />
      </React.Fragment>
    )

    return (
      <View style={styles.wrapper}>
        <Header
          title={this.state.tripInfo.route_short_name}
          subtitle={this.state.tripInfo.route_long_name || ''}
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
const LiveLine = withRouter(LiveLineWithoutRouter)
export { LiveLine }
