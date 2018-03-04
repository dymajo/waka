import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'
import { StationStore } from '../../stores/stationStore.js'
import { SettingsStore } from '../../stores/settingsStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'
import iconhelper from '../../helpers/icon.js'

const IconHelper = new iconhelper()

import Header from './header.jsx'
import TripItem from './tripitem_new.jsx'

const scroll = (by = 250) => {
  requestAnimationFrame(() => {
    window.scrollBy({ 
      top: by,
      left: 0, 
      behavior: 'smooth' 
    })
  })
}

const normalStyle = UiStore.getAnimation()
const fancyStyle = UiStore.getAnimation('fancy')

class Station extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }
  liveRefresh
  realtimeRefresh
  scroll = {}
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
    fancyMode: false,
    currentTrips: [],
    definedOrder: [],
    animation: 'unmounted',
  }

  triggerUpdate = () => {
    this.getData(this.props, false)
  }
  getData(newProps, getTimes = true) {
    StationStore.getData(newProps.match.params.station, newProps.match.params.region).then((data) => {
      let name = data.stop_name
      let description = data.stop_name
      if (data.description) {
        name = data.name || name
        description = data.description
      }
      document.title = name + ' - ' + t('app.name')

      let route_type = data.route_type
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
      this.setState({
        name: name,
        description: description,
        route_type: route_type,
        stop_lat: data.stop_lat, 
        stop_lon: data.stop_lon
      })
      SettingsStore.state.lastLocation = [data.stop_lat, data.stop_lon]
      SettingsStore.saveState()
    }).catch((err) => {
      console.log(err)
    })

    if (getTimes) {
      StationStore.getTimes(newProps.match.params.station, newProps.match.params.region)
    }
  }
  tripsCb = () => {    
    const tripData = StationStore.tripData
    const rtData = StationStore.realtimeData
    if (tripData.length === 0) {
      // scroll when loaded
      if (this.state.trips.length === 0 && this.state.fancyMode && window.scrollY === 71) {
        scroll()
      }

      return this.setState({
        loading: false
      })
    }

    if (this.state.trips.length === 0 && this.state.fancyMode && window.scrollY === 71 && tripData[0].route_type !== 3) {
      scroll()
    }

    if (Object.keys(rtData).length > 0) {
      return this.realtimeCb()
    }

    this.setState({
      html: null,
      trips: tripData,
      loading: false
    })

    this.reduceTrips(tripData)
    StationStore.getRealtime(tripData, this.props.match.params.station, this.props.match.params.region)
  }
  realtimeCb = () => {
    const tripData = StationStore.tripData
    const rtData = StationStore.realtimeData
     
    if (Object.keys(this.state.realtime).length === 0 && this.state.fancyMode && window.scrollY === 71 && tripData[0].route_type === 3) {
      scroll()
    }
    this.setState({
      html: null,
      trips: tripData,
      loading: false,
      realtime: rtData
    })
    this.reduceTrips(tripData, rtData)
  }
  reduceTrips = (data, rtData = {}) => {
    const reducer = new Map()
    data.forEach((trip) => {
      if (typeof(trip.stop_sequence) === 'undefined') {
        return
      }
      if (trip.route_short_name === 'OUT') {
        if (trip.direction_id === 0) {
          trip.trip_headsign = 'Clockwise Outer Link'
        } else {
          trip.trip_headsign = 'Anticlockwise Outer Link'
        }
      } else if (trip.route_short_name === 'INN') {
        if (trip.direction_id === 0) {
          trip.trip_headsign = 'Clockwise Inner Link'
        } else {
          trip.trip_headsign = 'Anticlockwise Inner Link'
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
      let lname = trip.route_short_name + trip.trip_headsign + trip.direction_id + ' via' + (trip.route_long_name.toLowerCase().split('via')[1] || '')
      if (!reducer.get(trip.route_short_name).has(lname)) {
        reducer.get(trip.route_short_name).set(lname, [])
      }
      reducer.get(trip.route_short_name).get(lname).push(trip)  
    })
    let all = []
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
      let newOrder = []
      reducer.forEach((value, key) => {
        // looks for duplicated headsigns, and adds vias.
        const duplicates = [...value.keys()].map(i => i.split(' via')[0]).reduce((result, item) => {
          if (item in result) {
            result[item] = 1
          } else {
            result[item] = 0
          }
          return result
        }, {});

        [...value.entries()].sort(sortFn).forEach((tripCollection) => {
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
      this.state.definedOrder.forEach((key) => {
        const data = reducer.get(key)
        if (typeof(data) !== 'undefined') {
          [...data.entries()].sort(sortFn).forEach((tripCollection) => {
            all.push(tripCollection)
          })
        }
      })
      this.setState({
        currentTrips: all,
      })
    }
  }
  triggerBack = () => {
    UiStore.goBack(this.props.history, '/')
  }
  
  triggerTouchStart = () => {
    this.isBeingTouched = true
  }
  triggerTouchEnd = () => {
    this.isBeingTouched = false
    if (window.scrollY < 40 && this.state.fancyMode) {
      UiStore.goBack(this.props.history, '/', true)
    }
  }
  triggerScroll = () => {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      if (window.scrollY < 40 && !this.isBeingTouched && this.state.fancyMode) {
        UiStore.goBack(this.props.history, '/', true)
      }
    }, 50)
  }
  componentWillMount() {
    // doesn't load fancymode on desktop :) 
    this.setState({
      fancyMode: UiStore.state.fancyMode && window.innerWidth <= 850
    })
  }
  componentDidMount() {
    StationStore.bind('change', this.triggerUpdate)
    StationStore.bind('times', this.tripsCb)
    StationStore.bind('realtime', this.realtimeCb)
    StationStore.bind('error', this.handleError)
    StationStore.bind('html', this.handleHtml)
    UiStore.bind('animation', this.animation)
    UiStore.bind('expandChange', this.expandChange)
    window.addEventListener('online',  this.triggerRetry)
    window.addEventListener('scroll', this.triggerScroll)

    // scroll top header into view
    if (this.state.fancyMode) {
      window.scrollTo(0, 71)
    }

    // uses cached data if it's still fresh
    if (StationStore.timesFor[0] === this.props.match.params.station &&
        new Date().getTime() - StationStore.timesFor[1].getTime() < 120000) {
      this.getData(this.props, false)
      this.tripsCb()
      StationStore.getRealtime(StationStore.tripData, this.props.match.params.station, this.props.match.params.region)
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
      StationStore.getRealtime(this.state.trips, this.props.match.params.station, this.props.match.params.region)
    }, timeout)
  }
  componentWillUnmount() {    
    StationStore.unbind('change', this.triggerUpdate)
    StationStore.unbind('times', this.tripsCb)
    StationStore.unbind('realtime', this.realtimeCb)
    StationStore.unbind('error', this.handleError)
    StationStore.unbind('html', this.handleHtml)
    UiStore.unbind('animation', this.animation)
    UiStore.unbind('expandChange', this.expandChange)
    window.removeEventListener('online',  this.triggerRetry)
    window.removeEventListener('scroll', this.triggerScroll)

    clearInterval(this.liveRefresh)
    clearInterval(this.realtimeRefresh)
  }
  expandChange = (item) => {
    setTimeout(() => {
      const itemPos = this.swipeContent.children[item[1]].getBoundingClientRect()
      if (itemPos.height > 72 && itemPos.top + itemPos.height > document.documentElement.clientHeight) {
        // calculates how much it overflows and adds it
        const overflowAmount = itemPos.top + itemPos.height - document.documentElement.clientHeight
        window.scrollBy({ 
          top: overflowAmount,
          left: 0, 
          behavior: 'smooth' 
        })
      }
    }, 250)
  }
  animation = (data) => {
    // ensures correct element
    if (data[1] !== this.container) {
      return
    // doesn't run if we're descending from down the tree up
    } else if (data[0] === 'exiting' && window.location.pathname !== '/') {
      return
    // doesn't run if we're descending further down the tree
    } else if (data[0] === 'entering' && UiStore.state.exiting.split('/').length > 4) {
      return
    } else {
      this.setState({
        animation: data[0]
      })
    }
  }
  handleError = (error) => {
    this.setState({
      html: null,
      error: error,
      loading: false
    })
    scroll()
  }
  handleHtml = (str) => {
    this.setState({
      html: str,
      loading: false,
    })
    scroll(350)
  }
  triggerRetry = () => {
    this.setState({
      html: null,
      error: null,
      loading: true
    })
    this.getData(this.props)
  }
  render() {
    const icon = IconHelper.getRouteType(this.state.route_type)
    
    let className = 'station'
    if (this.state.fancyMode) {
      className += ' fancy'
    }

    let loading
    let content
    if (this.state.loading) {
      loading = (
        <div className="spinner" />
      )
    } else if (this.state.html !== null) {
      content = <div>
        <div dangerouslySetInnerHTML={{__html: this.state.html.html}} />
        <div className="align-center" style={{paddingBottom: '15px'}}>
          <a target="_blank" rel="noopener" href={this.state.html.url} className="nice-button primary">More Info</a>
          <a target="_blank" rel="noopener" href={this.state.html.twitter} className="nice-button secondary">@{this.state.html.twitter.split('/').slice(-1)} on Twitter</a>
        </div>
      </div>
    } else if (this.state.error !== null) {
      loading = <div className="error"><p>{this.state.error}</p><button className="nice-button primary" onTouchTap={this.triggerRetry}>{t('app.errorRetry')}</button></div>
    } else if (this.state.currentTrips.length === 0) {
      loading = <div className="error"><p>{t('station.noservices')}</p></div>
    } else {
      content = this.state.currentTrips.map((item, key) => {
        return <TripItem key={item[0]} collection={item[1]} realtime={this.state.realtime} index={key} vias={item[2]} />
      })
    }

    const styles = this.state.fancyMode ? fancyStyle[this.state.animation] : normalStyle[this.state.animation]

    return (
      <div className={className} style={styles} ref={e => this.container = e} onTouchStart={this.triggerTouchStart} onTouchEnd={this.triggerTouchEnd}>
        <div className="station-spacer" />
        <Header
          name={this.state.name}
          description={this.state.description}
          fancy={this.state.fancyMode}
          icon={icon}
        />
        <ul className="trip-content" ref={e => this.swipeContent = e}>
          {loading}{content}
        </ul>
      </div>
    )
  }
}
const StationWithRouter = withRouter(Station)
export default StationWithRouter