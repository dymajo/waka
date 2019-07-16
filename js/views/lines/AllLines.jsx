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
const icons = new Map([
  [
    2,
    Icon({
      iconUrl: '/icons/normal/train-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    3,
    Icon({
      iconUrl: '/icons/normal/bus-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    700,
    Icon({
      iconUrl: '/icons/normal/bus-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    900,
    Icon({
      iconUrl: '/icons/normal/cablecar-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    4,
    Icon({
      iconUrl: '/icons/normal/ferry-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    100,
    Icon({
      iconUrl: '/icons/normal/train-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    106,
    Icon({
      iconUrl: '/icons/normal/train-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    400,
    Icon({
      iconUrl: '/icons/normal/train-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
  [
    401,
    Icon({
      iconUrl: '/icons/normal/train-fill.svg',
      iconSize: [24, 24],
      className: 'vehIcon',
    }),
  ],
])

let styles = null

class AllLines extends React.Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
  }

  layer = new Layer()

  pointsLayer = new Layer()

  liveLayer = new Layer()

  state = {
    color: '#666',
    trains: false,
    buses: false,
    lightrail: false,
    ferries: false,
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

  async getRealtime() {
    const { buses, ferries, trains, lightrail } = this.state
    console.log(this.state)
    const res = await fetch(
      `${local.endpoint}/${this.props.match.params.region}/realtime/all?ferries=${ferries}&buses=${buses}&trains=${trains}&lightrail=${lightrail}`
    )

    const data = await res.json()
    if (res.status >= 400) {
      const error = new Error(data.message)
      error.response = data
      throw error
    }
    return data
  }

  getPositionData = async () => {
    console.log(this.state)
    let busPositions = null
    let trainPositions = null
    let lightRailPositions = null
    let ferryPostitions = null
    try {
      const data = await this.getRealtime()
      this.liveLayer.hide()
      this.liveLayer = new Layer()
      busPositions = {
        type: 'MultiPoint',
        coordinates: [],
      }
      trainPositions = {
        type: 'MultiPoint',
        coordinates: [],
      }
      lightRailPositions = {
        type: 'MultiPoint',
        coordinates: [],
      }
      ferryPostitions = {
        type: 'MultiPoint',
        coordinates: [],
      }
      data.forEach(trip => {
        if (trip.latitude !== undefined) {
          switch (trip.route_type) {
            case 3:
            case 700:
            case 712:
              busPositions.coordinates.push([trip.longitude, trip.latitude])

              break
            case 2:
            case 400:
            case 401:
            case 100:
            case 106:
              trainPositions.coordinates.push([trip.longitude, trip.latitude])
              break
            case 0:
            case 900:
              lightRailPositions.coordinates.push([
                trip.longitude,
                trip.latitude,
              ])
              break
            case 4:
            case 1000:
              ferryPostitions.coordinates.push([trip.longitude, trip.latitude])
              break
            default:
              break
          }
        }
      })
      const busIcon = icons.get(3)
      const trainIcon = icons.get(2)
      const lightRailIcon = icons.get(900)
      const ferryIcon = icons.get(4)
      const { buses, ferries, trains, lightrail } = this.state
      if (buses) {
        this.liveLayer.add('geojson', busPositions, {
          icon: busIcon,
        })
      }
      if (trains) {
        this.liveLayer.add('geojson', trainPositions, {
          icon: trainIcon,
        })
      }
      if (lightrail) {
        this.liveLayer.add('geojson', lightRailPositions, {
          icon: lightRailIcon,
        })
      }
      if (ferries) {
        this.liveLayer.add('geojson', ferryPostitions, {
          icon: ferryIcon,
        })
      }

      if (this.cancelCallbacks === true) return 'cancelled'
      this.liveLayer.show()
      return 'done'
    } catch (err) {
      console.log(err)
      // who cares about the error
      console.error('Could not load realtime.')
    }
  }

  trainsOn = () => {
    this.setState(state => ({ trains: !state.trains }))
    this.getPositionData()
  }

  ferriesOn = () => {
    this.setState(state => ({ ferries: !state.ferries }))
    this.getPositionData()
  }

  lightrailOn = () => {
    this.setState(state => ({ lightrail: !state.lightrail }))
    this.getPositionData()
  }

  busesOn = () => {
    this.setState(state => ({ buses: !state.buses }))
    this.getPositionData()
  }

  render() {
    const { match } = this.props
    const {
      error,
      errorMessage,
      loading,
      trains,
      ferries,
      lightrail,
      buses,
    } = this.state

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
        <label htmlFor="trains">
          <input
            type="checkbox"
            value={trains}
            onChange={this.trainsOn}
            id="trains"
          />
          trains?
        </label>
        <label htmlFor="buses">
          <input
            type="checkbox"
            value={buses}
            onChange={this.busesOn}
            id="buses"
          />
          buses?
        </label>
        <label htmlFor="ferries">
          <input
            type="checkbox"
            value={ferries}
            onChange={this.ferriesOn}
            id="ferries"
          />
          ferries?
        </label>
        <label htmlFor="lightrail">
          <input
            type="checkbox"
            value={lightrail}
            onChange={this.lightrailOn}
            id="lightrail"
          />
          lightrail?
        </label>
      </React.Fragment>
    )

    return (
      <View style={styles.wrapper}>
        <Header title={match.params.line_id} subtitle="" />
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
export default withRouter(AllLines)
