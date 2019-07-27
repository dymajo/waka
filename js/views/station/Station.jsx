import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'
import { View, StyleSheet } from 'react-native'

import { vars } from '../../styles'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import StationStore from '../../stores/StationStore.js'
import SettingsStore from '../../stores/SettingsStore.js'
import UiStore from '../../stores/UiStore.js'
import { t } from '../../stores/translationStore.js'
import CurrentLocation from '../../stores/CurrentLocation.js'

import SavedIcon from '../../../dist/icons/saved.svg'
import UnsavedIcon from '../../../dist/icons/unsaved.svg'

import { TripItem } from './TripItemV2.jsx'
import Onzo from './Onzo.jsx'

class Station extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }

  scrollContent = React.createRef()

  swipeContent = React.createRef()

  liveRefresh

  realtimeRefresh

  state = {
    name: '',
    description: '',
    trips: [],
    reducedTrips: [],
    loading: true,
    error: null,
    html: null,
    route_type: undefined,
    stop_lat: undefined,
    stop_lon: undefined,
    updated: undefined,
  }

  constructor(props) {
    super(props)
    if (
      UiStore.state.lastTransition !== 'backward' &&
      UiStore.state.cardPosition === 'map'
    ) {
      requestAnimationFrame(() => {
        UiStore.setCardPosition('default')
      })
    }
  }

  triggerUpdate = () => {
    this.getData(this.props, false)
  }

  async getData(newProps, getTimes = true) {
    const stop = newProps.match.params.station
    const { region } = newProps.match.params
    try {
      const data = await StationStore.getData(stop, region)
      let name = data.stop_name
      let description = data.stop_name
      if (data.description) {
        name = data.name || name
        description = data.description
      }

      let { route_type } = data
      if (data.icon === 'train') {
        route_type = 2
      } else if (data.icon === 'bus') {
        route_type = 3
      } else if (data.icon === 'ferry') {
        route_type = 4
      } else if (data.icon === 'cablecar') {
        route_type = 5
      } else if (data.icon === 'parkingbuilding') {
        route_type = -1
      }

      if (route_type === 3) {
        description = `${t('station.bus')} ${stop}`
      }
      if (stop.split('+').length > 1) {
        description = t('savedStations.stops', {
          number: stop.split('+').join(', '),
        })
      }

      this.setState({
        name: this.getName(name),
        description,
        route_type,
        stop_lat: data.stop_lat,
        stop_lon: data.stop_lon,
        updated: data.updated || null,
      })
      CurrentLocation.setInitialPosition(data.stop_lat, data.stop_lon)
      SettingsStore.state.lastLocation = [data.stop_lat, data.stop_lon]
      SettingsStore.saveState()
    } catch (err) {
      throw new Error(err)
    }

    if (getTimes) {
      StationStore.getTimes(
        newProps.match.params.station,
        newProps.match.params.region
      )
    }
  }

  tripsCb = () => {
    const { tripData } = StationStore
    const rtData = StationStore.realtimeData
    if (tripData.length === 0) {
      return this.setState({
        loading: false,
      })
    }

    if (Object.keys(rtData).length > 0) {
      return this.realtimeCb()
    }

    this.setState({
      html: null,
      trips: tripData,
      loading: false,
    })

    this.reduceTrips(tripData)
    StationStore.getRealtime(
      tripData,
      this.props.match.params.station,
      this.props.match.params.region
    )
  }

  realtimeCb = () => {
    const { tripData } = StationStore
    const rtData = StationStore.realtimeData

    this.setState({
      html: null,
      trips: tripData,
      loading: false,
    })
    this.reduceTrips(tripData, rtData)
  }

  reduceTrips = (data, realtimeData = {}) => {
    const reducer = new Map()
    data.forEach(trip => {
      if (trip.stop_sequence === undefined) return

      // this is so the route_numbers group together
      const uniqueKey = [trip.route_short_name, trip.agency_id].join('-')
      if (!reducer.has(uniqueKey)) {
        reducer.set(uniqueKey, new Map())
      }

      // this is so all the same routes group together
      const via = trip.route_long_name.split('via')[1] || ''
      const uniqueTripKey = [
        trip.route_short_name,
        trip.trip_headsign,
        trip.agency_id,
        via,
        trip.direction_id,
      ].join('-')
      if (!reducer.get(uniqueKey).has(uniqueTripKey)) {
        reducer.get(uniqueKey).set(uniqueTripKey, [])
      }

      // This allows buses to be two minutes late, and still show on the app.
      let tolerance = 1000 * 60 * 2
      if (realtimeData[trip.trip_id] !== undefined) {
        const realtimeTrip = realtimeData[trip.trip_id]
        trip.departure_time_seconds += realtimeTrip.delay
        trip.isRealtime = true

        // it's still realtime if it's a random stop sequence, so tighten the tolerance up a bit
        if (
          realtimeTrip.stop_sequence === -100 ||
          trip.stop_sequence - realtimeTrip.stop_sequence === 0
        ) {
          tolerance = 1000 * 60
          // maybe need to ensure it's due?
        } else if (trip.stop_sequence - realtimeTrip.stop_sequence < 0) {
          // departed
          return
        }
      } else {
        trip.isRealtime = false
      }
      // console.log(realtimeData[trip.trip_id])
      const offsetTime = new Date().getTime() + StationStore.offsetTime
      const departure = new Date(offsetTime)
      departure.setHours(0)
      departure.setMinutes(0)
      departure.setSeconds(parseInt(trip.departure_time_seconds, 10))
      if (departure < new Date(offsetTime - tolerance)) {
        return
      }

      // adds the trip to the group
      reducer
        .get(uniqueKey)
        .get(uniqueTripKey)
        .push(trip)
    })

    const tripGroups = []
    reducer.forEach(tripGroup => {
      const sortedGroup = []
      tripGroup.forEach(tripVariant => {
        if (tripVariant.length === 0) return
        sortedGroup.push(
          tripVariant.sort((a, b) => {
            return a.departure_time_seconds - b.departure_time_seconds
          })
        )
      })
      // sorts each group by the one that is probably not finishing up
      // then, by departure time
      if (sortedGroup.length === 0) return
      sortedGroup.sort((a, b) => {
        const stopSequenceDifference = a[0].stop_sequence - b[0].stop_sequence
        if (stopSequenceDifference !== 0) return stopSequenceDifference
        return a[0].departure_time_seconds - b[0].departure_time_seconds
      })
      tripGroups.push(sortedGroup)
    })

    // sorts each of the groups by time, then flattens
    const trips = tripGroups
      .sort((a, b) => {
        return a[0][0].departure_time_seconds - b[0][0].departure_time_seconds
      })
      .reduce((acc, val) => acc.concat(val), [])

    // console.log(trips)
    // console.log(data, realtimeData)
    this.setState({ reducedTrips: trips })
  }

  componentDidMount() {
    StationStore.bind('change', this.triggerUpdate)
    StationStore.bind('times', this.tripsCb)
    StationStore.bind('realtime', this.realtimeCb)
    StationStore.bind('error', this.handleError)
    StationStore.bind('html', this.handleHtml)
    window.addEventListener('online', this.triggerRetry)

    // uses cached data if it's still fresh
    if (
      StationStore.timesFor[0] === this.props.match.params.station &&
      new Date().getTime() - StationStore.timesFor[1].getTime() < 120000
    ) {
      this.getData(this.props, false)
      this.tripsCb()
      StationStore.getRealtime(
        StationStore.tripData,
        this.props.match.params.station,
        this.props.match.params.region
      )
    } else {
      this.getData(this.props)
    }

    // times: every 3 minutes
    // realtime: every 20 seconds
    const timeout = this.props.match.params.region === 'nz-akl' ? 20000 : 30000
    this.liveRefresh = setInterval(() => {
      this.getData(this.props)
    }, 180000)
    this.realtimeRefresh = setInterval(() => {
      StationStore.getRealtime(
        this.state.trips,
        this.props.match.params.station,
        this.props.match.params.region
      )
    }, timeout)
  }

  componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
    StationStore.unbind('times', this.tripsCb)
    StationStore.unbind('realtime', this.realtimeCb)
    StationStore.unbind('error', this.handleError)
    StationStore.unbind('html', this.handleHtml)
    window.removeEventListener('online', this.triggerRetry)

    clearInterval(this.liveRefresh)
    clearInterval(this.realtimeRefresh)
  }

  handleError = error => {
    this.setState({
      html: null,
      error,
      loading: false,
    })
  }

  handleHtml = str => {
    this.setState({
      html: str,
      loading: false,
    })
  }

  triggerRetry = () => {
    this.setState({
      html: null,
      error: null,
      loading: true,
    })
    this.getData(this.props)
  }

  triggerSave = () => {
    UiStore.safePush('./save')
  }

  triggerMap = (agencyId, routeShortName, directionId) => {
    const { history, match } = this.props
    const url = ['/l', match.params.region, agencyId, routeShortName].join('/')
    history.push(`${url}?direction=${directionId}`)
  }

  getName(name) {
    name = name.replace(' Interchange', ' -')
    name = name.replace(' Bus Station', ' -')
    name = name.replace(' Train Station', '')
    name = name.replace(' Ferry Terminal', '')
    name = name.replace('- Cable Car Station', '')
    name = name.replace(' Station', '')
    return name
  }

  render() {
    let loading
    let content
    if (this.state.loading) {
      loading = <div className="spinner" />
    } else if (this.state.route_type === -2) {
      content = <Onzo updated={this.state.updated} />
    } else if (this.state.html !== null) {
      content = (
        <div>
          <div dangerouslySetInnerHTML={{ __html: this.state.html.html }} />
          <div className="align-center" style={{ paddingBottom: '15px' }}>
            <a
              target="_blank"
              rel="noopener"
              href={this.state.html.url}
              className="nice-button primary"
            >
              More Info
            </a>
            <a
              target="_blank"
              rel="noopener"
              href={this.state.html.twitter}
              className="nice-button secondary"
            >
              @{this.state.html.twitter.split('/').slice(-1)} on Twitter
            </a>
          </div>
        </div>
      )
    } else if (this.state.error !== null) {
      loading = (
        <div className="error">
          <p>{this.state.error}</p>
          <button className="nice-button primary" onClick={this.triggerRetry}>
            {t('app.errorRetry')}
          </button>
        </div>
      )
    } else if (this.state.reducedTrips.length === 0) {
      loading = (
        <div className="error">
          <p>{t('station.noservices')}</p>
        </div>
      )
    } else {
      content = (
        <View style={styles.tripWrapper}>
          {this.state.reducedTrips.map((item, key) => {
            const tripId = item[0].trip_id
            const agencyId = item[0].agency_id
            const routeShortName = item[0].route_short_name
            const directionId = item[0].direction_id
            const routeColor = item[0].route_color
            return (
              <TripItem
                key={tripId}
                routeShortName={routeShortName}
                direction={directionId}
                color={routeColor}
                trips={item.map(i => {
                  const departure = new Date(
                    new Date().getTime() + StationStore.offsetTime
                  )
                  departure.setHours(0)
                  departure.setMinutes(0)
                  departure.setSeconds(parseInt(i.departure_time_seconds, 10))
                  return {
                    destination: i.trip_headsign,
                    departureTime: departure,
                    isRealtime: i.isRealtime,
                  }
                })}
                onClick={() =>
                  this.triggerMap(agencyId, routeShortName, directionId)
                }
              />
            )
          })}
        </View>
      )
    }

    const { region } = this.props.match.params
    const stop = this.props.match.params.station
    const regionStop = `${region}|${stop}`

    const actionIcon =
      StationStore.getOrder().indexOf(regionStop) === -1 ? (
        <UnsavedIcon style={saveStyle} />
      ) : (
        <SavedIcon style={saveStyle} />
      )

    return (
      <View style={styles.wrapper}>
        <Header
          title={this.state.name}
          subtitle={this.state.description}
          actionIcon={actionIcon}
          actionFn={this.triggerSave}
        />
        <LinkedScroll ref={this.scrollContent}>
          <div className="trip-content" ref={this.swipeContent}>
            {loading}
            {content}
          </div>
        </LinkedScroll>
      </View>
    )
  }
}
export default withRouter(Station)

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  tripWrapper: {
    backgroundColor: '#000',
  },
})
const saveStyle = { fill: vars.headerIconColor }
