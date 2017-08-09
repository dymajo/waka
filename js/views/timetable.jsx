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
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.addEventListener('touchstart', this.triggerTouchStart)
      this.container.addEventListener('touchmove', this.triggerTouchMove)
      this.container.addEventListener('touchend', this.triggerTouchEnd)
      this.container.addEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.removeEventListener('touchstart', this.triggerTouchStart)
      this.container.removeEventListener('touchmove', this.triggerTouchMove)
      this.container.removeEventListener('touchend', this.triggerTouchEnd)
      this.container.removeEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.unbind('animation', this.animation)
  }
  animation = (data) => {
    if (data[1] !== this.container) {
      return
    }
    this.setState({
      animation: data[0]
    })
  }
  triggerTouchStart = event => {
    // This is a hack to detect flicks  
    this.longTouch = false
    setTimeout(() => {
      this.longTouch = true
    }, 250)

    this.touchStartPos = event.touches[0].pageX
  }
  triggerTouchMove = event => {
    if (this.touchStartPos <= 7) {
      event.preventDefault()
      this.newPos = Math.max(event.touches[0].pageX - this.touchStartPos, 0)
      this.container.setAttribute('style', 'transform: translate3d('+this.newPos+'px,0,0);')
    }
  }
  triggerTouchEnd = () => {
    if (this.touchStartPos <= 7) {
      this.touchStartPos = 100
      let swipedAway = false
      if (this.newPos > window.innerWidth/2 || this.longTouch === false) {
        // rejects touches that don't really move
        if (this.newPos > 3) {
          swipedAway = true
        }
      }
      if (swipedAway) {
        // navigate backwards with no animate flag
        UiStore.goBack('/', true)
        this.container.setAttribute('style', 'transform: translate3d(100vw,0,0);transition: transform 0.3s ease-out;')
      } else {
        this.container.setAttribute('style', 'transform: translate3d(0px,0,0);transition: transform 0.3s ease-out;')
      }
    }
  }
  goingBack() {
    if (UiStore.state.goingBack) {
      this.setState({
        goingBack: true
      })
    }
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