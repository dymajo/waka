import React from 'react'
import PropTypes from 'prop-types'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

const style = UiStore.getAnimation()

// this is hacked so it handles the current location
// and just normal people looking up a line
class VehicleLocationBootstrap extends React.Component {
  state = {
    showContent: false,
    tripInfo: {},
    stopInfo: {},
    lineInfo: [],
    animation: 'unmounted',
  }

  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }

  componentWillMount() {
    if ('line_id' in this.props.match.params) {
      return this.lineMountCb(this.props)
    }
    this.tripMountCb(this.props)
  }
  componentDidUpdate() {
    if (typeof(this.state.tripInfo.route_long_name) !== 'undefined') {
      if ('line_id' in this.props.match.params) {
        document.title = this.state.tripInfo.route_short_name + ' - ' + this.state.tripInfo.route_long_name + ' - Transit'
      } else {
        document.title = this.state.tripInfo.route_short_name + ' - Live Location - Transit'
      }
    }
  }
  componentDidMount() {
    System.import('./vehicle_loc.jsx').then(module => {
      this.VehicleLocation = module.default
      this.setState({
        showContent: true
      })
    })

    if ('line_id' in this.props.match.params) {
      fetch(`/a/nz-akl/line/${this.props.match.params.line_id}`).then((response) => {
        response.json().then((data) => {
          let tripInfo = JSON.parse(JSON.stringify(this.state.tripInfo))
          tripInfo.route_long_name = data[0].route_long_name
          tripInfo.shape_id = data[0].shape_id
          tripInfo.route_type = data[0].route_type
          // tripInfo.route_type = data[]
          this.setState({
            lineInfo: data,
            tripInfo: tripInfo
          })
        })
      })
    }
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
    } else if (data[0] === 'exiting' && UiStore.state.exiting.substring(0, window.location.pathname.length) !== window.location.pathname) {
      return
    }
    this.setState({
      animation: data[0]
    })
  }
  lineMountCb = (newProps) => {
    StationStore.getLines().then((data) => {
      this.setState({
        tripInfo: {
          route_short_name: newProps.match.params.line_id,
          agency_id: data.operators[newProps.match.params.line_id]
        }
      })
    })
  }
  tripMountCb = (newProps) => {
    const tripNodeMatches = (item) => {
      return item.trip_id === newProps.match.params.trip_id
    }
    StationStore.getData(this.props.match.params.station).then((data) => {
      this.setState({
        tripInfo: StationStore.tripData.find(tripNodeMatches) || this.state.tripInfo,
        stopInfo: data
      })
    })
  }
  triggerBack = () => {
    let newUrl = window.location.pathname.split('/')
    if (newUrl[3] === 'realtime') {
      newUrl.splice(-2)  
    } else {
      newUrl.splice(-1)
    }
    UiStore.goBack(this.props.history, newUrl.join('/'))
  }
  triggerChange = e => {
    let newLine = this.state.lineInfo[e.currentTarget.value]
    let tripInfo = JSON.parse(JSON.stringify(this.state.tripInfo))

    tripInfo.route_long_name = newLine.route_long_name
    tripInfo.shape_id = newLine.shape_id
    this.setState({
      tripInfo: tripInfo
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
  render() {
    let content = null
    let lineSelect = this.state.tripInfo.route_long_name || ''
    lineSelect = lineSelect.replace(/ Train Station/g, '')
    
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

    if (this.state.showContent === true && (this.state.animation !== 'entering' || this.state.animation !== 'unmounted')) {
      if ('line_id' in this.props.match.params) {
        let stopInfo = [-36.844229, 174.767823]
        content = (<this.VehicleLocation 
          params={this.props.match.params}
          lineInfo={this.state.lineInfo}
          tripInfo={this.state.tripInfo}
          stopInfo={stopInfo}
        />
        )
        if (this.state.lineInfo.length > 1) {
          lineSelect = this.state.lineInfo.map(function(line, key) {
            return <option key={key} value={key}>{line.route_long_name.replace(/ Train Station/g, '')}</option>
          })
          lineSelect = <select onChange={this.triggerChange}>{lineSelect}</select>
        }
      } else {
        let stopInfo = [this.state.stopInfo.stop_lat, this.state.stopInfo.stop_lon || this.state.stopInfo.stop_lng]
        if (typeof(stopInfo[0]) === 'undefined') {
          stopInfo = [-36.844229, 174.767823]
        }
        content = (
          <this.VehicleLocation 
            trips={StationStore.tripData}
            realtime={StationStore.realtimeData}
            params={this.props.match.params}
            tripInfo={this.state.tripInfo}
            stopInfo={stopInfo}
          />
        )
      }
    }

    return (
      <div className='vehicle-location-container' ref={e => this.container = e} style={style[this.state.animation]}>
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <h1 className='line-name'>
              <section className="line-pill-wrapper-header">
                <span className={roundelStyle} style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>
                  {code}
                </span>
              </section>
              <section className="selectWrapper">{lineSelect}</section>
            </h1>
          </div>
        </header>
        {content}
      </div>
    )
  }
}
export default VehicleLocationBootstrap