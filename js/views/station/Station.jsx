import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'
import { View, StyleSheet } from 'react-native'

import { vars } from '../../styles'
import Header from '../reusable/Header.jsx'
import Spinner from '../reusable/Spinner.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'
import StationData from '../../data/StationData.js'
import StationStore from '../../stores/StationStore.js'
import SettingsStore from '../../stores/SettingsStore.js'
import UiStore from '../../stores/UiStore.js'
import { t } from '../../stores/translationStore.js'
import CurrentLocation from '../../stores/CurrentLocation.js'

import SavedIcon from '../../../dist/icons/saved.svg'
import UnsavedIcon from '../../../dist/icons/unsaved.svg'

import { TripItem } from './TripItemV2.jsx'
import { InactiveTrips } from './InactiveTrips.jsx'

class Station extends Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }

  liveRefresh

  realtimeRefresh

  // non reduced version, for realtime
  trips = []

  state = {
    name: '',
    description: '',
    trips: [],
    routes: [],
    loading: true,
    error: null,
    html: null,
  }

  stationData = new StationData()

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

  componentDidMount() {
    this.getStationInfo()
    this.getStationTimes()
    window.addEventListener('online', this.triggerRetry)

    // times: every 3 minutes
    // realtime: every 15 seconds
    this.liveRefresh = setInterval(() => {
      this.getStationTimes()
    }, 180000)
    this.realtimeRefresh = setInterval(() => {
      this.getStationRealtime()
    }, 15000)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.triggerRetry)
    clearInterval(this.liveRefresh)
    clearInterval(this.realtimeRefresh)
  }

  getStationInfo = async () => {
    const { region, station } = this.props.match.params
    try {
      const stationInfo = await this.stationData.getStationInfo(region, station)
      const { name, description, stopLat, stopLon } = stationInfo
      this.setState({ name, description })

      if (stopLat !== 0 && stopLon !== 0) {
        CurrentLocation.setInitialPosition(stopLat, stopLon)
        SettingsStore.state.lastLocation = [stopLat, stopLon]
        SettingsStore.saveState()
      }
    } catch (err) {
      console.error(err)
    }
  }

  getStationTimes = async () => {
    const { stationData } = this
    const { region, station } = this.props.match.params
    const stops = station.split('+')
    try {
      const stationsTimes = await Promise.all(
        stops.map(s => stationData.getStationTimes(region, s))
      )

      let allTrips = []
      let routes = []
      let reducedTrips = []
      let triggerRefresh = false
      let html = false
      stationsTimes.forEach(stationTime => {
        const { trips, realtime, allRoutes } = stationTime
        if ('html' in stationTime) {
          html = stationTime
          return
        }
        allTrips.push(trips)
        routes.push(allRoutes)
        if (realtime == null) {
          triggerRefresh = true
          reducedTrips.push(stationData.reduceTrips(trips))
        } else {
          reducedTrips.push(stationData.reduceTrips(trips, realtime))
        }
      })

      // i wish it was never implemented this way
      if (html !== false) {
        this.setState({
          loading: false,
          html,
        })
        return
      }

      this.trips = allTrips
      if (triggerRefresh) {
        this.getStationRealtime()
      }

      const activeRoutes = reducedTrips
        .map(j => j.map(i => `${i[0].agency_id}/${i[0].route_short_name}`))
        .flat()

      this.setState({
        routes: this.stationData.reduceRoutes(routes, stops, activeRoutes),
        trips: reducedTrips,
        loading: false,
      })
    } catch (err) {
      this.setState({
        loading: false,
        error: err.message,
      })
    }
  }

  getStationRealtime = async () => {
    const { trips, stationData } = this
    const { region, station } = this.props.match.params
    try {
      const reducedTrips = await Promise.all(
        trips.map(async t => {
          const realtime = await stationData.getRealtimeTrips(
            region,
            t,
            station
          )
          return stationData.reduceTrips(t, realtime)
        })
      )
      this.setState({ trips: reducedTrips })
    } catch (err) {
      console.error(err)
    }
  }

  triggerRetry = () => {
    this.setState({
      html: null,
      error: null,
      loading: true,
    })
    this.getStationInfo()
    this.getStationTimes()
  }

  triggerMap = (agencyId, routeId, routeShortName, directionId) => {
    const { history, match } = this.props
    const url = ['/l', match.params.region, agencyId, routeShortName].join('/')
    const stopId = match.params.station

    history.push(
      `${url}?route_id=${routeId}&direction=${directionId}&stop_id=${stopId}`
    )
  }

  render() {
    let loading
    let content

    const { trips, error, html, routes } = this.state

    const { region } = this.props.match.params
    const stop = this.props.match.params.station
    if (this.state.loading) {
      loading = <Spinner />
    } else if (html !== null) {
      content = (
        <div>
          <div dangerouslySetInnerHTML={{ __html: html.html }} />
          <div className="align-center" style={{ paddingBottom: '15px' }}>
            <a
              target="_blank"
              rel="noopener"
              href={html.url}
              className="nice-button primary"
            >
              More Info
            </a>
            <a
              target="_blank"
              rel="noopener"
              href={html.twitter}
              className="nice-button secondary"
            >
              @{html.twitter.split('/').slice(-1)} on Twitter
            </a>
          </div>
        </div>
      )
    } else if (error !== null) {
      loading = (
        <div className="error">
          <p>{error}</p>
          <button
            type="button"
            className="nice-button primary"
            onClick={this.triggerRetry}
          >
            {t('app.errorRetry')}
          </button>
        </div>
      )
    } else if (trips.flat().length === 0) {
      loading = (
        <div className="error">
          <p>{t('station.noservices')}</p>
        </div>
      )
    } else {
      content = (
        <View style={styles.tripWrapper}>
          {trips.map(t =>
            t.map(item => {
              const {
                trip_id: tripId,
                agency_id: agencyId,
                route_short_name: routeShortName,
                direction_id: directionId,
                route_color: routeColor,
                route_id: routeId,
                route_text_color: routeTextColor,
                route_icon: routeIcon,
              } = item[0]
              return (
                <TripItem
                  key={tripId}
                  routeShortName={routeShortName}
                  routeIcon={routeIcon}
                  direction={directionId}
                  color={routeColor}
                  textColor={routeTextColor}
                  region={region}
                  trips={item.map(i => ({
                    destination: i.trip_headsign,
                    departureTime: new Date(i.realtime_departure_time),
                    isRealtime: i.isRealtime,
                    platform: i.platform,
                  }))}
                  isTwentyFourHour={SettingsStore.state.isTwentyFourHour}
                  onClick={() =>
                    this.triggerMap(
                      agencyId,
                      routeId,
                      routeShortName,
                      directionId
                    )
                  }
                />
              )
            })
          )}
        </View>
      )
    }

    const isSaved = StationStore.getOrder().indexOf(`${region}|${stop}`) === -1
    return (
      <View style={styles.wrapper}>
        <Header
          title={this.state.name}
          subtitle={this.state.description}
          actionIcon={
            isSaved ? (
              <UnsavedIcon style={saveStyle} />
            ) : (
              <SavedIcon style={saveStyle} />
            )
          }
          actionFn={() => UiStore.safePush('./save')}
        />
        <LinkedScroll>
          {loading}
          {content}
          <InactiveTrips
            routes={routes}
            onClick={this.triggerMap}
            region={region}
          />
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
