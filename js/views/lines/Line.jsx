import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native'
import leaflet from 'leaflet'
import { withRouter } from 'react-router'
import queryString from 'query-string'

import { vars } from '../../styles.js'
import UiStore from '../../stores/UiStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'

import Layer from '../maps/MapboxLayer.jsx'
import LineData from '../../data/LineData.js'
import { LineStops } from './stops/LineStops.jsx'
import { LineTimetable } from './timetable/LineTimetable.jsx'
import { LineErrorBoundary } from './LineErrorBoundary.jsx'
import TripInfo from './TripInfo.jsx'

import LineIcon from '../../../dist/icons/linepicker.svg'

let styles = null

class Line extends React.Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
  }

  liveLayer = new Layer('live-vehicles')

  tripStops = []

  constructor(props) {
    super(props)

    const { match, location } = this.props

    const parsed = queryString.parse(location.search)
    this.lineData = new LineData({
      region: match.params.region,
      route_short_name: match.params.route_short_name,
      agency_id: match.params.agency_id,
      route_id: parsed.route_id || null,
      trip_id: parsed.trip_id || null,
      stop_id: parsed.stop_id || null,
      direction_id: parsed.direction === '1' ? 1 : 0,
    })

    this.state = {
      lineMetadata: [],
      realtimeStopUpdates: {},
      currentTrip: parsed.trip_id || null,
      vehiclepos: [],
    }

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
      this.getRealtimeStopUpdate()
    }, 10000)
  }

  componentWillUnmount() {
    this.liveLayer.hide(true, false)
    this.liveLayer.unmounted = true

    clearInterval(this.liveRefresh)
    this.cancelCallbacks = true
  }

  async getData() {
    const metadata = await this.lineData.getMeta()

    if (metadata.length === 0) {
      clearInterval(this.liveRefresh)
      this.setState({
        error: true,
        errorMessage: 'The line was not found.',
      })
      return
    }

    const route =
      metadata.find(i => i.direction_id === this.lineData.direction_id) ||
      metadata[0]
    this.lineData.direction_id = route.direction_id

    // if the stop wasn't specified in the URL
    if (this.lineData.stop_id === null) {
      this.lineData.stop_id = route.first_stop_id
    }

    this.setState({
      lineMetadata: metadata,
    })
  }

  getPositionData = async () => {
    let busPositions = null
    try {
      const data = await this.lineData.getRealtime()
      this.liveLayer.hide(true, true)
      this.liveLayer = new Layer('live-vehicles')
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
      if (lineMetadata.length === 0) return 'cancelled' // this if it the line can't loa
      this.liveLayer.add('geojson', busPositions, {
        typeExtension: 'VehicleMarker',
        typeExtensionOptions: {
          region: this.lineData.region,
          route_type: lineMetadata[0].route_type
        }
      })
      if (this.cancelCallbacks === true) return 'cancelled'
      this.liveLayer.show()
      this.setState({ vehiclepos: data })
      return 'done'
    } catch (err) {
      console.error(err)
    }
  }

  getRealtimeStopUpdate = async () => {
    const realtimeStopUpdates = await this.lineData.getRealtimeStopUpdate()
    this.setState({ realtimeStopUpdates })
  }

  setRealtimeTrips = (trips, triggerUpdate) => {
    this.lineData.realtime_trips = trips
      .filter(t => t.realtimeQuery === true)
      .map(t => t.trip_id)

    if (triggerUpdate) this.getRealtimeStopUpdate()
  }

  triggerTrip = tripId => {
    return () => {
      this.setState({
        currentTrip: tripId,
      })
    }
  }

  triggerPicker = () => {
    const { location } = this.props
    UiStore.safePush(`./picker${location.search}`)
  }

  render() {
    const { match } = this.props
    const {
      error,
      errorMessage,
      lineMetadata,
      currentTrip,
      realtimeStopUpdates,
      vehiclepos,
    } = this.state

    const currentLine =
      lineMetadata.length > 0
        ? lineMetadata.length === 1
          ? lineMetadata[0]
          : lineMetadata.find(
              i => i.direction_id === this.lineData.direction_id
            )
        : {}

    return (
      <View style={styles.wrapper}>
        <LineErrorBoundary
          line={match.params.route_short_name}
          forceError={error}
          errorMessage={errorMessage}
        >
          <Header
            title={match.params.route_short_name}
            subtitle={currentLine.route_long_name || ''}
            actionIcon={<LineIcon />}
            actionFn={this.triggerPicker}
          />
          <LinkedScroll>
            <LineTimetable
              region={match.params.region}
              line={match.params.route_short_name}
              stopId={this.lineData.stop_id}
              tripId={currentTrip}
              directionId={this.lineData.direction_id}
              agencyId={this.lineData.agency_id}
              triggerTrip={this.triggerTrip}
              setRealtimeTrips={this.setRealtimeTrips}
              realtimeStopUpdates={realtimeStopUpdates}
            />
            {window.location.hostname === 'localhost' ? (
              <TripInfo
                trip={vehiclepos.find(pos => pos.trip_id === currentTrip)}
              />
            ) : null}
            <LineStops
              region={match.params.region}
              line={match.params.route_short_name}
              stopId={this.lineData.stop_id}
              tripId={currentTrip}
              realtimeTripUpdate={realtimeStopUpdates[currentTrip]}
            />
          </LinkedScroll>
        </LineErrorBoundary>
      </View>
    )
  }
}

styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  departures: {
    flexDirection: 'row',
    overflowX: 'scroll',
    paddingBottom: vars.padding / 2,
  },
  departure: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    width: `calc(33.3333% - ${Math.floor((vars.padding * 4) / 3)}px)`,
    marginLeft: vars.padding,
    borderRadius: 3,
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
  },
  departureSelected: {
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  departureDate: {
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: vars.fontFamily,
    fontSize: 16,
  },
  departureStatus: {
    textAlign: 'center',
    fontFamily: vars.fontFamily,
    fontSize: 13,
    color: '#888',
  },
})
export default withRouter(Line)
