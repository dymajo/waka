import React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'
import { StationStore, StationMap } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

import SavedStations from './savedstations.jsx'

const paddingHeight = 250
const barHeight = 56
const animationSpeed = 250
class Index extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mapView: false,
      showMap: false
    }
    this.Search = null // Map Component, dynamic load

    document.body.style.setProperty('--real-height', document.documentElement.clientHeight + 'px');

    this.touchstartpos = null // actual start pos
    this.fakestartpos = null  // used for non janky animations
    this.touchlastpos = null // used to detect flick
    this.scrolllock = false  // used so you know the difference between scroll & transform

    this.loadMapDynamic = this.loadMapDynamic.bind(this)
    this.toggleStations = this.toggleStations.bind(this)
    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchMove = this.triggerTouchMove.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)

    window.onresize = function() {
      document.body.style.setProperty('--real-height', document.documentElement.clientHeight + 'px');
    }
  }
  componentDidMount() {
    if (window.location.pathname === '/') {
      this.loadMapDynamic()
    }
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname === '/') {
      this.loadMapDynamic()
    }
  }
  loadMapDynamic() {
    // doesn't do anything if already loaded
    if (this.Search !== null) {
      return
    }
    // this ensures the map is the last thing to load
    // only loads on main page, i.e if nothing is in front of it
    require.ensure(['react-leaflet'], () => {
      this.Search = require('./search.jsx').default

      requestAnimationFrame(() => {      
        this.setState({
          showMap: true 
        })
      })
    })
  }
  toggleStations() {
    requestAnimationFrame(() => {
      if (this.state.mapView === false) {
        this.refs.touchcard.scrollTop = 0
      }
      this.setState({
        mapView: !this.state.mapView
      })
    })
  }
  triggerTouchStart(e) {
    // only start the pull down if they're at the top of the card
    if (this.refs.touchcard.scrollTop === 0 && window.innerWidth < 851) {
      this.touchstartpos = e.touches[0].clientY
      this.fakestartpos = e.touches[0].clientY
      this.touchlastpos = e.touches[0].clientY

      this.scrolllock = null
      this.windowHeight = document.documentElement.clientHeight / 2
      this.cardHeight = e.currentTarget.offsetHeight - paddingHeight - barHeight

      // kill transition
      this.refs.touchcard.style.transition = 'initial'
      this.refs.touchmap.style.transition = 'initial'

      // hack to detect flicks
      this.longtouch = false
      setTimeout(() => {
        this.longtouch = true
      }, animationSpeed)
    } else {
      this.touchstartpos = null
      this.fakestartpos = null
      this.longtouch = null
      this.scrolllock = null
    }
  }
  triggerTouchMove(e) {
    // cancels if they're not at the top of the card
    if (this.touchstartpos === null) {
      return
    }

    // todo animate between first touchstart & touchmove
    let scrollLogic = () => {
      if (this.scrolllock === true) {
        // fix if starting from bottom
        let offset = e.changedTouches[0].clientY - this.fakestartpos
        let offsetPadding = this.cardHeight
        if (this.state.mapView === true) {
          offsetPadding = this.cardHeight + paddingHeight - 25
          offset = offset + this.cardHeight + paddingHeight 
        }
        // limits from scrolling over start or end
        if (offset < 0) {
          offset = 0
        } else if (offset > offsetPadding) {
          offset = offsetPadding
        }

        // stores last touch position for use on touchend to detect flick
        this.touchlastpos = e.changedTouches[0].clientY

        // calculates percentage of card height, and applies that to map transform
        let mapoffset = Math.round(offset / offsetPadding * (this.windowHeight - 56 - 64) * window.devicePixelRatio) / window.devicePixelRatio
        mapoffset = mapoffset - (this.windowHeight - 56 - 64)

        let cardtransform = `translate3d(0,${offset}px,0)`
        let maptransform = `translate3d(0,${mapoffset}px,0)`
        requestAnimationFrame(() => {
          this.refs.touchcard.style.transform = cardtransform
          this.refs.touchmap.style.transform = maptransform
        })
        e.preventDefault()
        return true
      } else if (this.scrolllock === false) {
        // scrolling enabled, do nothing
        return true
      }
    }
    // return if it executes
    if (scrollLogic() === true) {
      return
    }

    // does the equality depending on state of card
    let newPos = e.changedTouches[0].clientY
    let equality = false
    if (this.state.mapView === true) {
      equality = this.touchstartpos < newPos
    } else if (this.state.mapView === false) {
      equality = this.touchstartpos > newPos
    }

    if (equality === false) {
      this.scrolllock = true

      // eliminiate the janky feel
      this.fakestartpos = newPos + (this.state.mapView ? -1 : 1)
      scrollLogic()
    } else {
      this.scrolllock = false
    }
  }
  triggerTouchEnd(e) {
    // cancels if the event never started
    if (this.touchstartpos === null) {
      return
    }

    // detects if they've scrolled over halfway
    if (this.longtouch === true) {
      let threshold = Math.round((e.currentTarget.offsetHeight - paddingHeight - barHeight) / 2)
      if (this.state.mapView === true) {
        threshold = e.currentTarget.offsetHeight / 2
      }
      let touchDelta = Math.abs(e.changedTouches[0].clientY - this.touchstartpos)
      if (touchDelta > threshold) {
        // hacks to make it not slow on slow device
        if (this.state.mapView) {
          this.refs.rootcontainer.className = 'root-container'
        } else {
          this.refs.rootcontainer.className = 'root-container map-view'
        }
        setTimeout(() => {
          this.toggleStations()
        }, animationSpeed)
      }
    // detects a flicks
    } else if (this.longtouch === false) {
      if (Math.abs(this.touchstartpos - this.touchlastpos) > 3) {
        // hacks to make it not slow on slow devices
        if (this.state.mapView) {
          this.refs.rootcontainer.className = 'root-container'
        } else {
          this.refs.rootcontainer.className = 'root-container map-view'
        }
        // special easing curve
        requestAnimationFrame(() => {
          this.refs.touchcard.style.transition = `${animationSpeed}ms ease-out transform`
          this.refs.touchcard.style.transform = ''
          this.refs.touchmap.style.transition = `${animationSpeed}ms ease-out transform`
          this.refs.touchmap.style.transform = ''
        })
        setTimeout(() => {
          this.toggleStations()
          requestAnimationFrame(() => {
            this.refs.touchcard.style.transition = ''
            this.refs.touchmap.style.transition = ''
          })
        }, 275)
        return
      }
    }
    requestAnimationFrame(() => {
      this.refs.touchcard.style.transition = ''
      this.refs.touchcard.style.transform = ''
      this.refs.touchmap.style.transition = ''
      this.refs.touchmap.style.transform = ''
    })
  }
  triggerSettings() {
    if (window.location.pathname === '/settings') {
      browserHistory.push('/')
    } else {
      browserHistory.push('/settings')
    }
  }
  render() {
    // I hate myself for doing this, but iOS scrolling is a fucking nightmare
    var className = 'panes'
    if (iOS.detect()) {
      className += ' ios'
    }
    // if it's running standalone, add a class because iOS doesn't support media queries
    if (window.navigator.standalone) {
      className += ' ios-standalone'
    }
    let rootClassName = 'root-container'
    if (this.state.mapView) {
      rootClassName += ' map-view'
      // stationsString = 'Home'
    }
    let map
    if (this.state.showMap) {
      map = <this.Search />
    }
    return (
      <div className={className}>
        <div className={rootClassName} ref="rootcontainer">
          <header className="material-header branding-header">
            <div>
            <span className="more" onClick={this.triggerSettings}><img src="/icons/settings.svg" /></span>
              <h1 className="full-height">
                <img className="logo" src='/icons/icon.svg' width='18' />
                <strong>DYMAJO Transit</strong></h1>
            </div>
          </header>
          <div className="root-map"
            ref="touchmap"
          >
            {map}
          </div>
          <div className="root-card enable-scrolling"
            ref="touchcard"
            onTouchStart={this.triggerTouchStart}
            onTouchMove={this.triggerTouchMove}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
          >
            <div className="root-card-padding-button" onClick={this.toggleStations}></div>
            <div className="root-card-bar">
              <button onTouchTap={this.toggleStations}>
                <img src="/icons/station.svg" />
                Stations
              </button>
              <button>
                <img src="/icons/lines.svg" />
                Lines
              </button>
              <button>
                <img src="/icons/alert.svg" />
                Status
              </button>
            </div>
            <div className="root-card-content">
              <SavedStations />
            </div>
          </div>
        </div>
        <div className="content">
        {this.props.children}
        </div>
      </div>
    )
  }
}
export default Index