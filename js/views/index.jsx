import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import { StationStore } from '../stores/stationStore.js'
import { t } from '../stores/translationStore.js'
import { CurrentLocation } from '../stores/currentLocation.js'

// routes
import RootHeader from './root/header.jsx'
import Router from './router.jsx'

import SavedStations from './savedstations.jsx'
import Pin from './pin.jsx'

import StationIcon from '../../dist/icons/station.svg'
import LinesIcon from '../../dist/icons/lines.svg'

const paddingHeight = 250
const barHeight = 56
const animationSpeed = 250
class Index extends React.Component {
  static propTypes = {
    location: PropTypes.object,
    history: PropTypes.object,
  }
  state = {
    region: false,
    mapView: false,
    showMap: false,
    animate: false,
    showPin: false,
    panLock: true,
  }
  constructor(props) {
    super(props)
    this.Search = null // Map Component, dynamic load

    document.body.style.setProperty('--real-height', document.documentElement.clientHeight + 'px')

    this.touchstartpos = null // actual start pos
    this.fakestartpos = null  // used for non janky animations
    this.touchlastpos = null // used to detect flick
    this.scrolllock = false  // used so you know the difference between scroll & transform

    window.onresize = function() {
      document.body.style.setProperty('--real-height', document.documentElement.clientHeight + 'px')
    }
  }
  componentDidMount() {
    this.loadMapDynamic()
    this.props.history.listen(UiStore.handleState)
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname === '/') {
      this.loadMapDynamic()
      document.title = t('app.name')
    }
    const n = nextProps.location.pathname
    const p = this.props.location.pathname
    if (n.split('/')[1] !== p.split('/')[1] && n.length > 2 && p.length > 2) {
      UiStore.state.canAnimate = false
      setTimeout(() => {
        UiStore.state.canAnimate = true
      }, UiStore.animationTiming + 25)
    }
  }
  loadMapDynamic = () => {
    // doesn't do anything if already loaded
    if (this.Search !== null) {
      return
    }
    // this ensures the map is the last thing to load
    // only loads on main page, i.e if nothing is in front of it
    System.import('./search.jsx').then(module => {
      this.Search = module.default
      this.setState({
        showMap: true 
      })
    })
  }
  toggleStations = () => {
    if (this.props.location.pathname !== '/') {
      return
    }
    if (window.innerWidth <= 850 && this.state.mapView === false) {
      CurrentLocation.startWatch()
    }
    requestAnimationFrame(() => {
      if (this.state.mapView === false) {
        this.touchcard.scrollTop = 0
      }
      UiStore.state.mapView = !this.state.mapView
      this.setState({
        mapView: !this.state.mapView
      })
    })
  }
  togglePin = () => {
    this.setState({
      showPin: !this.state.showPin
    })
  }
  toggleLines = () => {
    if (this.props.location.pathname !== '/') {
      return
    }
    this.props.history.push('/l/' + StationStore.currentCity)
  }
  toggleRegion = () => {
    this.setState({
      region: !this.state.region,
    })
  }
  triggerTouchStart = (e) => {
    // only start the pull down if they're at the top of the card
    if (this.touchcard.scrollTop === 0 && window.innerWidth < 851 && this.props.location.pathname === '/') {
      this.touchstartpos = e.touches[0].clientY
      this.fakestartpos = e.touches[0].clientY
      this.touchlastpos = e.touches[0].clientY

      this.scrolllock = null
      this.windowHeight = document.documentElement.clientHeight / 2
      this.cardHeight = e.currentTarget.offsetHeight - paddingHeight - barHeight

      // kill transition
      this.touchcard.style.transition = 'initial'
      this.touchmap.style.transition = 'initial'

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
    if (this.state.mapView && this.touchcard.scrollTop !== 0) {
      this.touchcard.scrollTop = 0
    }
  }
  triggerTouchMove = (e) => {
    // cancels if they're not at the top of the card
    if (this.touchstartpos === null) {
      return
    }

    // todo animate between first touchstart & touchmove
    const scrollLogic = () => {
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
          this.touchcard.style.transform = cardtransform
          this.touchmap.style.transform = maptransform
        })
        if (iOS.detect()) {
          e.preventDefault()
        }
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
      // this is like scrolling up on the bar - stops the scroll on body in iOS
      if (equality && iOS.detect()) {
        e.preventDefault()
      }
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
  triggerTouchEnd = (e) => {
    // cancels if the event never started
    if (this.touchstartpos === null || this.scrolllock === false) {
      return
    }

    // detects if they've scrolled over halfway
    if (this.longtouch === true) {
      let threshold = Math.round((e.currentTarget.offsetHeight - paddingHeight - barHeight) / 2)
      if (this.state.mapView === true) {
        threshold = e.currentTarget.offsetHeight / 2
      } else {
        // stops from scrolling down if they're halfway down the page
        if (this.touchcard.scrollTop !== 0) {
          return
        }
      }
      let touchDelta = Math.abs(e.changedTouches[0].clientY - this.touchstartpos)
      if (touchDelta > threshold) {
        // hacks to make it not slow on slow device
        if (this.state.mapView) {
          this.rootcontainer.className = 'root-container'
        } else {
          this.rootcontainer.className = 'root-container map-view'
        }
        setTimeout(() => {
          this.toggleStations()
        }, animationSpeed)
      }
    // detects a flickss
    } else if (this.longtouch === false && Math.abs(this.touchstartpos - this.touchlastpos) > 15) {
      // hacks to make it not slow on slow devices
      if (this.state.mapView) {
        this.rootcontainer.className = 'root-container'
      } else {
        this.rootcontainer.className = 'root-container map-view'
      }
      // special easing curve
      requestAnimationFrame(() => {
        this.touchcard.style.transition = `${animationSpeed}ms ease-out transform`
        this.touchcard.style.transform = ''
        this.touchmap.style.transition = `${animationSpeed}ms ease-out transform`
        this.touchmap.style.transform = ''
      })
      setTimeout(() => {
        this.toggleStations()
        requestAnimationFrame(() => {
          this.touchcard.style.transition = ''
          this.touchmap.style.transition = ''
        })
      }, 275)
      return
    }
    requestAnimationFrame(() => {
      this.touchcard.style.transition = ''
      this.touchcard.style.transform = ''
      this.touchmap.style.transition = ''
      this.touchmap.style.transform = ''
    })
  }
  triggerScroll = (e) => {
    if ((e.currentTarget.scrollTop === 0 && this.state.panLock === false) 
      || (e.currentTarget.scrollTop !== 0 && this.state.panLock === true)) {
      this.setState({
        panLock: !this.state.panLock
      })
    }
  }
  render() {
    // I hate myself for doing this, but iOS scrolling is a fucking nightmare
    let className = 'panes'
    if (iOS.detect()) {
      className += ' ios'
    }
    // if it's running standalone, add a class because iOS doesn't support media queries
    if (window.navigator.standalone) {
      className += ' ios-standalone'
    }

    const map = this.state.showMap ? <this.Search /> : null
    const pin = this.state.showPin ? <Pin onHide={this.togglePin} /> : null

    const rootClassName = 'root-container ' + (this.state.mapView ? 'map-view' : '')
    const rootCardClass = 'root-card enable-scrolling ' + (this.state.panLock ? 'pan-lock' : '')

    return (
      <div className={className}>
        <div className={rootClassName} ref={e => this.rootcontainer = e}>
          <RootHeader region={this.state.region} toggleRegion={this.toggleRegion} />
          <div className="root-map" ref={e => this.touchmap = e}>
            {map}
          </div>
          <div className={rootCardClass}
            ref={e => this.touchcard = e}
            onTouchStart={this.triggerTouchStart}
            onTouchMove={this.triggerTouchMove}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
            onScroll={this.triggerScroll}
          >
            <div className="root-card-padding-button" onTouchTap={this.toggleStations}></div>
            <div className="root-card-bar">
              <button onTouchTap={this.toggleStations}>
                <StationIcon />
                {t('root.stationsLabel')}
              </button>
              <button onTouchTap={this.toggleLines}>
                <LinesIcon />
                {t('root.linesLabel')}
              </button>
            </div>
            <SavedStations togglePin={this.togglePin} toggleRegion={this.toggleRegion} />
          </div>
        </div>
        <Router />
        {pin}
      </div>
    )
  }
}
const IndexWithHistory = withRouter(Index)
export default IndexWithHistory