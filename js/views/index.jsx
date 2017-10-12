import React from 'react'
import { withRouter, Switch, Route } from 'react-router-dom'
import { TransitionGroup, Transition } from 'react-transition-group'
import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import { StationStore } from '../stores/stationStore.js'
import { t } from '../stores/translationStore.js'

// routes
import Station from './station.jsx'
import Lines from './lines.jsx'
import Settings from './settings.jsx'
import Sponsor from './sponsor.jsx'
import TestLines from './test_lines.jsx'
import Timetable from './timetable.jsx'
import VehicleLocationBootstrap from './vehicle_loc_bootstrap.jsx'
import NoMatch from './nomatch.jsx'
import RegionPopover from './region-popover.jsx'

import SavedStations from './savedstations.jsx'
import Pin from './pin.jsx'

// static
// import LogoIcon from '../../dist/icons/icon.svg'
import SettingsIcon from '../../dist/icons/settings.svg'
import StationIcon from '../../dist/icons/station.svg'
import LinesIcon from '../../dist/icons/lines.svg'

const paddingHeight = 250
const barHeight = 56
const animationSpeed = 250
class Index extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mapView: false,
      showMap: false,
      animate: false,
      showPin: false,
      hideUi: false,
      in: false,
      region: false,
      currentCity: StationStore.currentCity
    }
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
    if (window.location.pathname === '/') {
      this.loadMapDynamic()
    }
    this.refs.touchcard.addEventListener('touchmove', this.triggerTouchMove, {passive: false})

    this.props.history.listen(UiStore.handleState)
    StationStore.bind('newcity', this.newcity)
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
  newcity = () => {
    this.setState({
      currentCity: StationStore.currentCity
    })
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

      requestAnimationFrame(() => {      
        this.setState({
          showMap: true 
        })
      })
    })
  }
  toggleStations = () => {
    requestAnimationFrame(() => {
      if (this.state.mapView === false) {
        this.refs.touchcard.scrollTop = 0
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
    this.props.history.push('/l/nz-akl')
  }
  triggerTouchStart = (e) => {
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
    if (this.state.mapView && this.refs.touchcard.scrollTop !== 0) {
      this.refs.touchcard.scrollTop = 0
    }
  }
  triggerTouchMove = (e) => {
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
  triggerSettings = () => {
    if (window.location.pathname === '/settings') {
      this.props.history.push('/')
    } else {
      this.props.history.push('/settings')
    }
  }
  triggerStateUpdate = (key) => {
    return (node) => {
      if (node) {
        if (key === 'entered') {
          UiStore.state.exiting = window.location.pathname
        }
        UiStore.trigger('animation', [key, node])
      }
    }
  }
  toggleRegion = () => {
    this.setState({
      region: !this.state.region
    })
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
    if (this.state.hideUi) {
      className += ' hide-ui'
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

    let contentClassname = 'content animate'
    if (!this.state.animate) {
      contentClassname += ' no-animate'
    }
    let modal = null
    if (this.state.showPin) {
      modal = <Pin onHide={this.togglePin} />
    }
    let firstHeadingClass = 'full-height'
    let secondHeading
    if (this.state.currentCity !== 'none') {
      firstHeadingClass = ''
      secondHeading = <h2>{t('regions.'+this.state.currentCity+'-long')} <small>▼</small></h2>
    }

    return (
      <div className={className}>
        <div className={rootClassName} ref="rootcontainer">
          <header className="material-header branding-header">
            <span className="header-left">
              <StationIcon />
            </span>
            <div className="header-expand menu" onTouchTap={this.toggleRegion}>
              <h1 className={firstHeadingClass}><strong>{t('app.name')}</strong></h1>
              {secondHeading}
            </div>
            <span className="header-right" onTouchTap={this.triggerSettings}>
              <SettingsIcon />
            </span>
          </header>
          <RegionPopover
            visible={this.state.region}
            toggle={this.toggleRegion}
          />
          <div className="root-map" ref="touchmap">
            {map}
          </div>
          <div className="root-card enable-scrolling"
            ref="touchcard"
            onTouchStart={this.triggerTouchStart}
            // fuck you chrome for making passive default
            // onTouchMove={this.triggerTouchMove}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
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
        <div className={contentClassname}>
          <TransitionGroup>
            <Transition
              timeout={300}
              key={this.props.location.key}
              onEntering={this.triggerStateUpdate('entering')}
              onEntered={this.triggerStateUpdate('entered')}
              onExiting={this.triggerStateUpdate('exiting')}
              onExited={this.triggerStateUpdate('exited')}
            >
              <Switch location={this.props.location} key={this.props.location.key} >
                <Route path="/" exact />

                <Route path="/s/:region/:station/realtime/:trip_id" component={VehicleLocationBootstrap} />
                <Route path="/s/:region/:station/timetable/:route_name" component={Timetable} />
                <Route path="/s/:region/:station" component={Station} />

                <Route path="/l/:region/:line_id" component={VehicleLocationBootstrap} />
                <Route path="/l/:region" component={Lines} />

                <Route path="/settings" component={Settings}/>
                <Route path="/sponsor" component={Sponsor}/>
                <Route path="/testlines" component={TestLines} />
                <Route component={NoMatch} />
              </Switch>
            </Transition>
          </TransitionGroup>
        </div>
        {modal}
      </div>
    )
  }
}
const IndexWithHistory = withRouter(Index)
export default IndexWithHistory