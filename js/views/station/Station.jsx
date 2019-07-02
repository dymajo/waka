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

import TripItem from './TripItem.jsx'
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
    realtime: {},
    loading: true,
    error: null,
    html: null,
    route_type: undefined,
    stop_lat: undefined,
    stop_lon: undefined,
    currentTrips: [],
    definedOrder: [],
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
      realtime: rtData,
    })
    this.reduceTrips(tripData, rtData)
  }

  reduceTrips = (data, rtData = {}) => {
    const reducer = new Map()
    data.forEach(trip => {
      if (typeof trip.stop_sequence === 'undefined') {
        return
      }
      if (trip.route_short_name === 'OUT') {
        if (trip.direction_id === 0) {
          trip.trip_headsign = 'Anticlockwise Outer Link'
        } else {
          trip.trip_headsign = 'Clockwise Outer Link'
        }
      } else if (trip.route_short_name === 'INN') {
        if (trip.direction_id === 0) {
          trip.trip_headsign = 'Anticlockwise Inner Link'
        } else {
          trip.trip_headsign = 'Clockwise Inner Link'
        }
      } else if (trip.route_short_name === 'CTY') {
        trip.trip_headsign = 'City Link'
      }
      if (rtData[trip.trip_id] && rtData[trip.trip_id].delay) {
        if (trip.stop_sequence - rtData[trip.trip_id].stop_sequence < 0) {
          return
        }
        // } else if (false) {
        // do something with the trains?
      } else {
        const offsetTime = new Date().getTime() + StationStore.offsetTime
        const arrival = new Date(offsetTime)
        arrival.setHours(0)
        arrival.setMinutes(0)
        arrival.setSeconds(parseInt(trip.departure_time_seconds) % 86400)
        // Let buses be 2 mins late, and don't show stuff more than 5 hours away
        const minsAway = Math.round((arrival - new Date(offsetTime)) / 60000)
        if (minsAway < -2 || minsAway > 300) {
          return
        }
      }
      // this is a GROUP BY basically
      if (!reducer.has(trip.route_short_name)) {
        reducer.set(trip.route_short_name, new Map())
      }
      // removes platforms and weirdness
      // this line doesn't group as well
      // let lname = trip.route_long_name.replace(/ \d/g, '').toLowerCase()
      const lname = `${trip.route_short_name +
        trip.trip_headsign +
        trip.direction_id} via${trip.route_long_name
        .toLowerCase()
        .split('via')[1] || ''}`
      if (!reducer.get(trip.route_short_name).has(lname)) {
        reducer.get(trip.route_short_name).set(lname, [])
      }
      reducer
        .get(trip.route_short_name)
        .get(lname)
        .push(trip)
    })
    const all = []
    let same = true
    reducer.forEach((value, key) => {
      if (this.state.definedOrder.indexOf(key) === -1) {
        same = false
      }
    })
    const sortFn = function(a, b) {
      return a[1][0].stop_sequence - b[1][0].stop_sequence
    }
    if (this.state.definedOrder.length === 0 || same === false) {
      const newOrder = []
      reducer.forEach((value, key) => {
        // looks for duplicated headsigns, and adds vias.
        const duplicates = [...value.keys()]
          .map(i => i.split(' via')[0])
          .reduce((result, item) => {
            if (item in result) {
              result[item] = 1
            } else {
              result[item] = 0
            }
            return result
          }, {})
        ;[...value.entries()].sort(sortFn).forEach(tripCollection => {
          tripCollection.push(false)
          if (duplicates[tripCollection[0].split(' via')[0]] > 0) {
            tripCollection[2] = true
          }
          all.push(tripCollection)
        })
        if (Object.keys(this.state.realtime).length > 0) {
          newOrder.push(key)
        }
      })
      this.setState({
        currentTrips: all,
        definedOrder: newOrder,
      })
    } else {
      this.state.definedOrder.forEach(key => {
        const data = reducer.get(key)
        if (typeof data !== 'undefined') {
          ;[...data.entries()].sort(sortFn).forEach(tripCollection => {
            all.push(tripCollection)
          })
        }
      })
      this.setState({
        currentTrips: all,
      })
    }
  }

  componentDidMount() {
    StationStore.bind('change', this.triggerUpdate)
    StationStore.bind('times', this.tripsCb)
    StationStore.bind('realtime', this.realtimeCb)
    StationStore.bind('error', this.handleError)
    StationStore.bind('html', this.handleHtml)
    UiStore.bind('expandChange', this.expandChange)
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
      if (window.innerWidth > 850) {
        this.setState({ definedOrder: [] })
      }
      this.getData(this.props)
    }, 180000)
    this.realtimeRefresh = setInterval(() => {
      if (window.innerWidth > 850) {
        this.setState({ definedOrder: [] })
      }
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
    UiStore.unbind('expandChange', this.expandChange)
    window.removeEventListener('online', this.triggerRetry)

    clearInterval(this.liveRefresh)
    clearInterval(this.realtimeRefresh)
  }

  expandChange = item => {
    setTimeout(() => {
      const itemPos = this.swipeContent.current.children[
        item[1]
      ].getBoundingClientRect()
      if (
        itemPos.height > 72 &&
        itemPos.top + itemPos.height > document.documentElement.clientHeight
      ) {
        // calculates how much it overflows and adds it
        const scrollView = this.scrollContent.current.scrollView.current
        const overflowAmount =
          itemPos.top +
          itemPos.height -
          document.documentElement.clientHeight +
          scrollView.getScrollableNode().scrollTop
        scrollView.scrollTo({ y: overflowAmount, behavior: 'smooth' })
      }
    }, 250)
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
    } else if (this.state.currentTrips.length === 0) {
      loading = (
        <div className="error">
          <p>{t('station.noservices')}</p>
        </div>
      )
    } else {
      content = this.state.currentTrips.map((item, key) => (
        <TripItem
          key={item[0]}
          collection={item[1]}
          realtime={this.state.realtime}
          index={key}
          vias={item[2]}
        />
      ))
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
})
const saveStyle = { fill: vars.headerIconColor }
