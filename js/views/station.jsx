import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router'
import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'
import TripItem from './tripitem_new.jsx'
import zenscroll from 'zenscroll'

import BackIcon from '../../dist/icons/back.svg'
import SavedIcon from '../../dist/icons/saved.svg'
import UnsavedIcon from '../../dist/icons/unsaved.svg'
import TrainIcon from '../../dist/icons/train.svg'
import FerryIcon from '../../dist/icons/ferry.svg'
import BusIcon from '../../dist/icons/bus.svg'

const iconMap = {
  train: <TrainIcon />,
  ferry: <FerryIcon />,
  bus: <BusIcon />
}

// hack
let liveRefresh, realtimeRefresh

const normalStyle = UiStore.getAnimation()
const fancyStyle = UiStore.getAnimation('fancy')

class Station extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }
  state = {
    name: '',
    description: '',
    trips: [],
    checked: {},
    realtime: {},
    loading: true,
    saveModal: null,
    stop_lat: undefined,
    stop_lon: undefined,
    fancyMode: false,
    currentTrips: [],
    definedOrder: [],
    animation: 'unmounted',
  }

  constructor(props) {
    super(props)
    this.state.checked = this.props.match.params.station.split('+').reduce((result, item) => {
      result[this.props.match.params.region + '|' + item] = true
      return result
    }, {})
  }
  // from https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
  getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    const deg2rad = function(deg) {
      return deg * (Math.PI/180)
    }
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2-lat1)  // deg2rad below
    const dLon = deg2rad(lon2-lon1) 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const d = R * c // Distance in km
    return d
  }
  triggerUpdate = () => {
    this.getData(this.props, false)
  }
  getData(newProps, getTimes = true) {
    StationStore.getData(newProps.match.params.station).then((data) => {
      let name = data.stop_name
      let description = data.stop_name
      if (data.description) {
        name = data.name
        description = data.description
      }
      document.title = name + ' - ' + t('app.name')
      this.setState({
        name: name,
        description: description,
        stop_lat: data.stop_lat, 
        stop_lon: data.stop_lon || data.stop_lng // horrible api design, probs my fault, idk
      })
    }).catch((err) => {
      console.log('error!')
    })

    if (getTimes) {
      StationStore.getTimes(newProps.match.params.station)
    }
  }
  tripsCb = () => {
    const tripData = StationStore.tripData
    const rtData = StationStore.realtimeData
    if (tripData.length === 0) {
      // scroll when loaded
      if (this.state.trips.length === 0 && this.state.fancyMode && this.scroll.scrollTop === 71) {
        requestAnimationFrame(() => {
          this.scroller.toY(250)
        })
      }

      return this.setState({
        loading: false
      })
    }

    if (this.state.trips.length === 0 && this.state.fancyMode && this.scroll.scrollTop === 71 && tripData[0].route_type !== '3') {
      requestAnimationFrame(() => {
        this.scroller.toY(250)
      })
    }

    if (Object.keys(rtData).length > 0) {
      return this.realtimeCb()
    }

    this.setState({
      trips: tripData,
      loading: false
    })

    this.reduceTrips(tripData)
    StationStore.getRealtime(tripData)
  }
  realtimeCb = () => {
    const tripData = StationStore.tripData
    const rtData = StationStore.realtimeData
    if (tripData[0].route_type === '2') {
      for (var key in rtData) {
        rtData[key] = {
          v_id: rtData[key].v_id,
          distance: this.getDistanceFromLatLonInKm(rtData[key].latitude, rtData[key].longitude, this.state.stop_lat, this.state.stop_lon)
        }
      }
    } 
    if (Object.keys(this.state.realtime).length === 0 && this.state.fancyMode && this.scroll.scrollTop === 71 && tripData[0].route_type === '3') {
      requestAnimationFrame(() => {
        this.scroller.toY(250)
      })
    }
    this.setState({
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
        const arrival = new Date()
        arrival.setHours(0)
        arrival.setMinutes(0)
        arrival.setSeconds(parseInt(trip.departure_time_seconds) % 86400)
        // Let buses be 2 mins late
        if (Math.round((arrival - new Date()) / 60000) < -2) {
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
      let lname = trip.route_short_name + trip.trip_headsign + ' via' + (trip.route_long_name.toLowerCase().split('via')[1] || '')
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
  triggerSave = () => {
    this.setState({
      saveModal: true
    })
  }
  triggerSaveAdd = () => {
    this.setState({
      saveModal: false
    })

    const stations = []
    const otherwise = []
    Object.entries(this.state.checked).forEach((item) => {
      if (item[1] === true) stations.push(item[0].split('|').slice(-1)[0])
      if (item[1] === false) otherwise.push(item[0].split('|').slice(-1)[0])
    })

    const newId = stations.join('+')
    StationStore.removeStop(this.props.match.params.region + '|' + this.props.match.params.station)
    stations.forEach((station) => StationStore.removeStop(this.props.match.params.region + '|' + station))
    otherwise.forEach((station) => StationStore.addStop(station, null, this.props.match.params.region))
    StationStore.addStop(newId, this.state.name, this.props.match.params.region)

    if (newId !== this.props.match.params.station && newId !== '') {
      this.props.history.replace(`/s/${this.props.match.params.region}/${newId}`)
    }
  }
  triggerSaveCancel = () => {
    this.setState({ saveModal: false })
  }
  triggerSaveChange = (e) => {
    this.setState({
      name: e.currentTarget.value
    })
  }
  triggerRemove = (e) => {
    StationStore.removeStop(this.props.match.params.region + '|' + this.props.match.params.station)
    this.setState({ saveModal: false })
  }
  triggerTouchStart = (e) => {
    iOS.triggerStart(e)
    this.isBeingTouched = true
  }
  triggerTouchEnd = () => {
    this.isBeingTouched = false
    if (this.scroll.scrollTop < 40 && this.state.fancyMode) {
      UiStore.goBack(this.props.history, '/', true)
    }
  }
  triggerScroll = (e) => {
    const pos = e.currentTarget.scrollTop
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      if (pos < 40 && !this.isBeingTouched && this.state.fancyMode) {
        UiStore.goBack(this.props.history, '/', true)
      }
    }, 50)
  }
  triggerScrollTap = (e) => {
    if (e.target.className.match('scrollwrap') && this.state.fancyMode) {
      UiStore.goBack(this.props.history, '/')
    }
  }
  componentWillMount() {
    // doesn't load fancymode on desktop :) 
    this.setState({
      fancyMode: UiStore.state.fancyMode && window.innerWidth <= 850
    })
  }
  componentDidMount() {
    // scroll top header into view
    if (this.state.fancyMode) {
      this.scroll.scrollTop = 71
    }

    // uses cached data if it's still fresh
    if (StationStore.timesFor[0] === this.props.match.params.station &&
        new Date().getTime() - StationStore.timesFor[1].getTime() < 120000) {
      this.getData(this.props, false)
      this.tripsCb()
      StationStore.getRealtime(StationStore.tripData)
    } else {
      this.getData(this.props)
    }

    // times: every 3 minutes
    // realtime: every 20 seconds
    liveRefresh = setInterval(() => {
      this.getData(this.props)
    }, 180000)
    realtimeRefresh = setInterval(() => {
      StationStore.getRealtime(this.state.trips)
    }, 20000)

    StationStore.bind('change', this.triggerUpdate)
    StationStore.bind('times', this.tripsCb)
    StationStore.bind('realtime', this.realtimeCb)
    UiStore.bind('animation', this.animation)
    UiStore.bind('expandChange', this.expandChange)

    this.scroller = zenscroll.createScroller(this.scroll)
  }
  componentWillUnmount() {    
    StationStore.unbind('change', this.triggerUpdate)
    StationStore.unbind('times', this.tripsCb)
    StationStore.unbind('realtime', this.realtimeCb)
    UiStore.unbind('animation', this.animation)
    UiStore.unbind('expandChange', this.expandChange)

    clearInterval(liveRefresh)
    clearInterval(realtimeRefresh)
  }
  expandChange = (item) => {
    setTimeout(() => {
      const itemPos = this.swipeContent.children[item[1]].getBoundingClientRect()
      if (itemPos.height > 72 && itemPos.top + itemPos.height > document.documentElement.clientHeight) {
        // calculates how much it overflows and adds it
        const overflowAmount = itemPos.top + itemPos.height - document.documentElement.clientHeight
        this.scroll.scrollTop = this.scroll.scrollTop + overflowAmount
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
  triggerCheckbox = (item) => {
    return (e) => {
      const checked = JSON.parse(JSON.stringify(this.state.checked))
      checked[item] = e.currentTarget.checked
      this.setState({
        checked: checked
      })
    }
  }
  componentWillReceiveProps(newProps) {
    // basically don't do anything if the station doesn't change
    if (this.props.match.params.station === newProps.match.params.station) {
    //   setTimeout(() => {
    //     if (this.state.fancyMode) {
    //       this.setState({
    //         fancyMode: false
    //       })
    //     }
    //   }, 300)
      return
    }

    this.setState({
      name: '',
      description: '',
      trips: [],
      realtime: {},
      loading: true,
      saveModal: false,
      currentTrips: [],
      definedOrder: [],
    })
    this.getData(newProps)
  }
  render() {
    const region = this.props.match.params.region
    const stop = this.props.match.params.station
    const regionStop = region + '|' + stop
    const icon = StationStore.getIcon(stop)
    let iconStr = this.state.description

    let topIcon = <span className="header-left" onTouchTap={this.triggerBack}><BackIcon /></span>
    let className = 'station'
    if (this.state.fancyMode) {
      className += ' fancy'
      if (this.state.name !== '') {
        topIcon = <span className={'header-left mode ' + icon}>{iconMap[icon]}</span>
      }
    }
    if (this.state.name !== '') {
      if (icon === 'bus') {
        iconStr = t('station.bus') + ' ' + stop
      }
      if (this.props.match.params.station.split('+').length > 1) {
        iconStr = t('savedStations.stops', {number: stop.split('+').join(', ')})
      }
    }

    let modalHeader, saveButton, combined, removeBtn
    if (StationStore.getOrder().indexOf(regionStop) === -1) {
      modalHeader = t('stationedit.title2')
      saveButton = <span className="header-right save" onTouchTap={this.triggerSave}><UnsavedIcon /></span>  
    } else {
      modalHeader = t('stationedit.title')
      saveButton = <span className="header-right remove" onTouchTap={this.triggerSave}><SavedIcon /></span>

      if (this.props.match.params.station.split('+').length === 1) {
        removeBtn = <button className="inline" onTouchTap={this.triggerRemove}>Remove Stop</button>
      }
    }

    const mergers = Object.keys(this.state.checked)
    StationStore.getOrder(region).forEach((item) => {
      if (item !== stop
        && mergers.indexOf(item) === -1
        && item.split('+').length === 1
      ) {
        mergers.push(item)
      }
    })
    mergers.sort()

    if (mergers.length > 1) {
      combined = (
        <div>
          <h3>{t('stationedit.merge')}</h3>
          <ul>
            {mergers.filter(i => i !== regionStop).map((item) => {
              return (
                <li key={item}>
                  <input id={'merge-' + item} onChange={this.triggerCheckbox(item)} type="checkbox" checked={this.state.checked[item] || false} />
                  <label htmlFor={'merge-' + item}>{item.split('|').slice(-1)[0]} - {(StationStore.StationData[item] || {}).name}</label>
                </li>
              )
            })}
          </ul>
        </div>
      )
    }

    let saveModal = 'modal-wrapper'
    if (this.state.saveModal === true) {
      saveModal += ' show'
    }

    var scrollable = 'scrollable'
    let loading
    if (this.state.loading) {
      loading = (
        <div className="spinner" />
      )
    } else if (this.state.currentTrips.length === 0) {
      loading = <div className="error">{t('station.noservices')}</div>
    } else {
      scrollable += ' enable-scrolling'
    }

    let all = this.state.currentTrips.map((item, key) => {
      return <TripItem key={item[0]} collection={item[1]} realtime={this.state.realtime} index={key} vias={item[2]} />
    })

    // draws the html
    const scrollwrap = 'scrollwrap offset'
    let styles
    if (this.state.fancyMode) {
      styles = fancyStyle[this.state.animation]
    } else {
      styles = normalStyle[this.state.animation]
    }

    let name = this.state.name
    name = name.replace(' Train Station', '')
    name = name.replace(' Ferry Terminal', '')
    const header = (
      <header className="material-header">
        {topIcon}
        <div className="header-expand">
          <h1>{name}</h1>
          <h2>{iconStr}</h2>
        </div>
        {saveButton}
      </header>
    )

    let headerPos = [header, null]
    if (this.state.fancyMode) {
      headerPos = [null, header]
    }

    return (
      <div className={className} style={styles} ref={e => this.container = e}>
        <div className={saveModal}>
          <div className="modal">
            <h2>{modalHeader}</h2>
            <div className="inner">
              <h3>{t('stationedit.name')}</h3>
              <input type="text" value={this.state.name} onChange={this.triggerSaveChange} ref={e => this.saveInput = e} />
              {combined}
              {removeBtn}
            </div>
            <button className="cancel" onTouchTap={this.triggerSaveCancel}>{t('stationedit.cancel')}</button>
            <button className="submit" onTouchTap={this.triggerSaveAdd}>{t('stationedit.confirm')}</button>
          </div>
        </div>
        {headerPos[0]}
        <ul className={scrollable}
          ref={e => this.scroll = e}
          onTouchTap={this.triggerScrollTap}
          onScroll={this.triggerScroll}
          onTouchStart={this.triggerTouchStart}
          onTouchEnd={this.triggerTouchEnd}
          onTouchCancel={this.triggerTouchEnd}
        >
          <div className={scrollwrap}>
            {headerPos[1]}
            <div className="swipe-content" ref={e => this.swipeContent = e}>
              {loading}{all}
            </div>
          </div>
        </ul>
      </div>
    )
  }
}
const StationWithRouter = withRouter(Station)
export default StationWithRouter