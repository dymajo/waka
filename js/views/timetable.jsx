import React from 'react'
import PropTypes from 'prop-types'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'

import BackIcon from '../../dist/icons/back.svg'

const style = UiStore.getAnimation()
const language = navigator.language || 'en'

export default class Timetable extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }
  state = {
    trips: [],
    tripInfo: {},
    animation: 'unmounted',
    loading: true,
    loadingMode: false,
    stopName: '',
    error: null,
    offset: 0,
  }
  times = {}
  failures = 0

  componentDidMount() {
    this.getData()
    const routeName = this.props.match.params.route_name.split('-')[0]
    document.title = t('timetable.header', {
      route: routeName,
      appname: t('app.name'),
    })
    UiStore.bind('animation', this.animation)
    window.addEventListener('online', this.triggerRetry)
  }
  componentWillUnmount() {
    UiStore.unbind('animation', this.animation)
    window.removeEventListener('online', this.triggerRetry)
  }
  componentDidUpdate() {
    if (
      this.scrollContainer.scrollHeight <= this.scrollContainer.clientHeight
    ) {
      this.getMoreData()
    }
  }
  animation = data => {
    if (data[1] !== this.container) {
      return
    } else if (
      data[0] === 'exiting' &&
      UiStore.state.exiting.substring(0, window.location.pathname.length) !==
        window.location.pathname
    ) {
      return
    }
    this.setState({
      animation: data[0],
    })
  }
  _tripsMap(data) {
    const tripsArr = []
    let lastTrip = null
    data.forEach(trip => {
      trip.day = new Date(trip.date)
      trip.date = new Date(trip.departure_time_seconds * 1000)
      if (lastTrip) {
        if (lastTrip.getUTCHours() !== trip.date.getUTCHours()) {
          const day = trip.day.toLocaleDateString(language, { weekday: 'long' })
          tripsArr.push({
            seperator: day + ' ' + trip.date.getUTCHours(),
          })
        }
      } else {
        const day = trip.day.toLocaleDateString(language, { weekday: 'long' })
        tripsArr.push({
          seperator: day + ' ' + trip.date.getUTCHours(),
        })
      }
      lastTrip = trip.date
      tripsArr.push(trip)
    })
    return tripsArr
  }
  getData() {
    if (!navigator.onLine) {
      this.setState({
        error: t('app.nointernet'),
        loading: false,
      })
      return
    }
    const route = this.props.match.params.route_name.split('-')[0]
    const tripNodeMatches = item => {
      return item.route_short_name === route
    }
    StationStore.getData(
      this.props.match.params.station,
      this.props.match.params.region
    ).then(data => {
      this.setState({
        tripInfo:
          StationStore.tripData.find(tripNodeMatches) || this.state.tripInfo,
        stopName: data.name || data.stop_name,
      })
    })

    const r = this.props.match.params.route_name.split('-')
    StationStore.getTimetable(
      this.props.match.params.station,
      r[0],
      r[1],
      this.props.match.params.region,
      this.state.offset
    )
      .then(data => {
        const tripsArr = this._tripsMap(data)

        this.setState({
          trips: tripsArr,
          loading: false,
        })

        if (tripsArr.length === 0) {
          console.log('getting more data')
          this.getMoreData()
        }

        requestAnimationFrame(() => {
          let time = new Date(
            new Date().getTime() + StationStore.offsetTime
          ).getHours()
          let found = false
          while (found === false && time > 0) {
            if ('time' + time in this.times) {
              found = true
            } else {
              time = time - 1
            }
          }
          // sets scroll height
          if (found) {
            // adds height of header to it
            this.scrollContainer.scrollTop =
              this.times['time' + time].getBoundingClientRect().top - 56
          }
        })
      })
      .catch(() => {
        this.setState({
          error: t('timetable.error'),
          loading: false,
        })
      })
  }
  triggerBack = () => {
    let newUrl = window.location.pathname.split('/')
    newUrl.splice(-2)
    UiStore.goBack(this.props.history, newUrl.join('/'))
  }
  triggerRetry = () => {
    this.setState({
      error: null,
      loading: true,
    })
    this.getData(this.props)
  }
  getMoreData = () => {
    if (this.state.loadingMore === true) {
      return
    }
    this.setState({
      loadingMore: true,
    })
    const r = this.props.match.params.route_name.split('-')
    StationStore.getTimetable(
      this.props.match.params.station,
      r[0],
      r[1],
      this.props.match.params.region,
      this.state.offset + 1
    )
      .then(data => {
        this.setState({
          trips: this.state.trips.concat(this._tripsMap(data)),
          loadingMore: false,
          offset: this.state.offset + 1,
        })

        if (data.length === 0 && this.failures < 7) {
          this.failures++
          this.getMoreData()
        }
      })
      .catch(() => {
        this.setState({
          loadingMore: false,
        })
      })
  }
  triggerScroll = e => {
    // intersection observer would be great, but have to support safari
    // and can't really be bothered shipping the polyfill yet
    const offset =
      e.currentTarget.scrollHeight -
      e.currentTarget.scrollTop -
      e.currentTarget.clientHeight
    if (offset < 800) {
      this.getMoreData()
    }
  }
  render() {
    let roundelStyle = 'line-pill'
    let code = this.props.match.params.route_name.split('-')[0]
    if (
      code === 'WEST' ||
      code === 'EAST' ||
      code === 'ONE' ||
      code === 'STH' ||
      code === 'NEX' ||
      code === 'PUK'
    ) {
      roundelStyle += ' cf'
      if (code === 'PUK') {
        code = 'S'
      } else {
        code = code[0]
      }
      if (typeof this.state.tripInfo.agency_id === 'undefined') {
        code = ''
      }
    }

    let opacity = false
    let loading
    let empty = null
    if (this.state.loading) {
      loading = <div className="spinner" />
    } else if (this.state.error !== null) {
      loading = (
        <div className="error">
          <p>{this.state.error}</p>
          <button className="nice-button primary" onClick={this.triggerRetry}>
            {t('app.errorRetry')}
          </button>
        </div>
      )
    } else if (this.state.trips.length === 0) {
      empty = (
        <div className="error">
          <p>{t('timetable.empty')}</p>
        </div>
      )
    }
    const offsetTime = new Date().getTime() + StationStore.offsetTime
    const currentTime = parseInt(
      new Date(offsetTime).getHours().toString() +
        ('0' + new Date(offsetTime).getMinutes()).slice(-2)
    )
    return (
      <div
        className="timetable-container"
        ref={e => (this.container = e)}
        style={style[this.state.animation]}
      >
        <header className="material-header">
          <span className="header-left" onClick={this.triggerBack}>
            <BackIcon />
          </span>
          <div className="header-expand">
            <span
              className={roundelStyle}
              style={{
                backgroundColor: (this.state.trips[1] || {}).route_color,
              }}
            >
              {code}
            </span>
            <h1 className="line-name">{t('timetable.title')}</h1>
            <h2>{this.state.stopName}</h2>
          </div>
        </header>
        <div
          className="timetable-content enable-scrolling"
          ref={e => (this.scrollContainer = e)}
          onTouchStart={iOS.triggerStart}
          onScroll={this.triggerScroll}
        >
          <div className="scrollwrap">
            {loading}
            {empty}
            <ul>
              {this.state.trips.map((item, key) => {
                if ('seperator' in item) {
                  let timeString = item.seperator.split(' ')[0] + ' '
                  const seperator = parseInt(item.seperator.split(' ')[1])

                  if (SettingsStore.state.clock) {
                    timeString += seperator + ':00'
                  } else {
                    timeString +=
                      (seperator % 12 === 0 ? 12 : seperator % 12) + ':00'
                    timeString += seperator >= 12 ? ' PM' : ' AM'
                  }
                  return (
                    <li
                      key={key}
                      ref={e => (this.times['time' + item.seperator] = e)}
                      className="seperator"
                    >
                      {timeString}
                    </li>
                  )
                }
                const absotime = parseInt(
                  item.date.getUTCHours() +
                    ('0' + item.date.getUTCMinutes()).slice(-2)
                )
                const name = item.route_long_name.split('Via')

                let timestring
                if (SettingsStore.state.clock) {
                  timestring =
                    item.date.getUTCHours() +
                    ':' +
                    ('0' + item.date.getUTCMinutes()).slice(-2)
                } else {
                  timestring =
                    (item.date.getUTCHours() % 12 === 0
                      ? 12
                      : item.date.getUTCHours() % 12) +
                    ':' +
                    ('0' + item.date.getUTCMinutes()).slice(-2)
                  timestring += item.date.getUTCHours() >= 12 ? ' PM' : ' AM'
                }

                let className = ''
                if (absotime > currentTime && opacity === false) {
                  opacity = true
                }
                if (!opacity) {
                  className += 'opacity'
                }
                return (
                  <li key={key} className={className}>
                    <div className="left">
                      {item.trip_headsign}
                      {name.length > 1 ? <small> via {name[1]}</small> : ''}
                    </div>
                    <div className="right">{timestring}</div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    )
  }
}
