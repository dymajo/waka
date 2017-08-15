import React from 'react'
import PropTypes from 'prop-types'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'
import { UiStore } from '../stores/uiStore.js'

const style = UiStore.getAnimation()

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
    stopName: ''
  }
  times = {}

  componentDidMount() {
    const route = this.props.match.params.route_name.split('-')[0]
    const tripNodeMatches = (item) => {
      return item.route_short_name === route
    }
    StationStore.getData(this.props.match.params.station).then((data) => {
      this.setState({
        tripInfo: StationStore.tripData.find(tripNodeMatches) || this.state.tripInfo,
        stopName: data.name || data.stop_name
      })
    })

    this.getData()
    document.title = this.props.match.params.route_name.split('-')[0] + ' Timetable - Transit'
    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    UiStore.unbind('animation', this.animation)
  }
  animation = (data) => {
    if (data[1] !== this.container) {
      return
    } else if (data[0] === 'exiting' && UiStore.state.exiting.substring(0, window.location.pathname.length) !== window.location.pathname) {
      return
    }
    this.setState({
      animation: data[0]
    })
  }
  getData() {
    const r = this.props.match.params.route_name.split('-')
    StationStore.getTimetable(this.props.match.params.station, r[0], r[1]).then((data) => {
      const tripsArr = []
      let lastTrip = null
      data.forEach((trip) => {
        trip.date = new Date(trip.arrival_time_seconds * 1000)
        if (lastTrip) {
          if (lastTrip.getUTCHours() !== trip.date.getUTCHours()) {
            tripsArr.push({
              seperator: trip.date.getUTCHours()
            })
          }
        } else {
          tripsArr.push({
            seperator: trip.date.getUTCHours()
          })
        }
        lastTrip = trip.date
        tripsArr.push(trip)
      })
    
      this.setState({
        trips: tripsArr,
        loading: false
      })

      requestAnimationFrame(() => {
        let time = new Date().getHours()
        let found = false
        while (found === false && time > 0) {
          if (('time'+time) in this.times) {
            found = true
          } else {
            time = time - 1
          }
        }
        // sets scroll height
        if (found) {
          // adds height of header to it
          this.scrollContainer.scrollTop = this.times['time' + time].getBoundingClientRect().top - 56
        }
      })
    })
  }
  triggerBack = () => {
    let newUrl = window.location.pathname.split('/')
    newUrl.splice(-2)  
    UiStore.goBack(this.props.history, newUrl.join('/'))
  }
  render() {
    let roundelStyle = 'line-pill'
    let code = this.state.tripInfo.route_short_name
    if (code === 'WEST' || code === 'EAST' || code === 'ONE' || code === 'STH' || code === 'NEX' || code === 'PUK') {
      roundelStyle += ' cf'
      if (code === 'PUK') {
        code = 'S'
      } else {
        code = code[0]
      }
      if (typeof(this.state.tripInfo.agency_id) === 'undefined') {
        code = ''
      }
    }

    let opacity = false
    let loading
    if (this.state.loading) {
      loading = (
        <div className="spinner" />
      )
    }

    const currentTime = parseInt(new Date().getHours().toString() + ('0' + new Date().getMinutes()).slice(-2))
    return (
      <div className='timetable-container' ref={e => this.container = e} style={style[this.state.animation]}>
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <span className={roundelStyle} style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>
              {code}
            </span>
            <h1 className='line-name'>Timetable</h1>
            <h2>{this.state.stopName}</h2>
          </div>
        </header>
        <div className="timetable-content enable-scrolling" ref={e => this.scrollContainer = e} onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            {loading}
            <ul>
              {this.state.trips.map((item, key) => {
                if ('seperator' in item) {
                  let timeString
                  if (SettingsStore.state.clock) {
                    timeString = item.seperator + ':00'
                  } else {
                    timeString = (item.seperator % 12 === 0 ? 12 : item.seperator % 12) + ':00'
                    timeString += item.seperator >= 12 ? ' PM' : ' AM'
                  }
                  return <li key={key} ref={e => this.times['time'+item.seperator] = e} className="seperator">{timeString}</li>
                }
                const absotime = parseInt(item.date.getUTCHours() + ('0' + item.date.getUTCMinutes()).slice(-2))
                const name = item.route_long_name.split('Via')

                let timestring
                if (SettingsStore.state.clock) {
                  timestring = item.date.getUTCHours() + ':' + ('0' + item.date.getUTCMinutes()).slice(-2)
                } else {
                  timestring = (item.date.getUTCHours() % 12 === 0 ? 12 : item.date.getUTCHours() % 12) + ':' + ('0' + item.date.getUTCMinutes()).slice(-2)
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
                    <div className="right">
                      {timestring}
                    </div>
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