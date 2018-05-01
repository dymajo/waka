import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'

import { iOS } from '../../models/ios.js'
import { UiStore } from '../../stores/uiStore.js'
import { StationStore } from '../../stores/stationStore.js'
import { t } from '../../stores/translationStore.js'
import { CurrentLocation } from '../../stores/currentLocation.js'

import { MapView } from './map.jsx'
import { ContentView } from './content.jsx'

// routes
import { Root } from '../root/index.jsx'
import RootHeader from '../root/header.jsx'
import Router from '../router.jsx'

import { Pin } from '../root/pin.jsx'

const paddingHeight = 75
const barHeight = 56
const animationSpeed = 250

const maxPosition = 75
const defaultPosition = 300
const minPosition = 0

class Index extends React.Component {
  static propTypes = {
    location: PropTypes.object,
    history: PropTypes.object,
  }
  state = {
    region: false,
    animate: false,
    showPin: false,
    cardPosition: 'default'
  }
  constructor(props) {
    super(props)
    this.Search = null // Map Component, dynamic load

    document.body.style.setProperty(
      '--real-height',
      document.documentElement.clientHeight + 'px'
    )

    this.panLock = true
    this.touchstartpos = null // actual start pos
    this.fakestartpos = null // used for non janky animations
    this.touchlastpos = null // used to detect flick
    this.scrolllock = false // used so you know the difference between scroll & transform

    window.onresize = function() {
      requestAnimationFrame(() => {
        document.body.style.setProperty(
          '--real-height',
          document.documentElement.clientHeight + 'px'
        )
      })
    }
  }
  componentDidMount() {
    this.props.history.listen(UiStore.handleState)
    this.touchcard.addEventListener('scroll', this.triggerScroll)
    this.touchcard.addEventListener('touchmove', this.triggerTouchMove)
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname === '/') {
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
  togglePin = () => {
    this.setState({
      showPin: !this.state.showPin,
    })
  }
  toggleStations = (newPosition) => {
    requestAnimationFrame(() => {
      // if (this.state.mapView === false) {
      //   this.touchcard.scrollTop = 0
      // }
      this.setState({
        cardPosition: newPosition
      })
    })
  }
  toggleRegion = () => {
    this.setState({
      region: !this.state.region,
    })
  }
  snapToWhat(pos) {
    // well you could definitely refactor it for less lines
    // but then you would be very confused what would be happening
    if (this.state.cardPosition === 'max') {
      const defaultThreshold = this.clientHeight - defaultPosition
      const defaultUpperThreshold = defaultThreshold / 2
      const defaultLowerThreshold = defaultThreshold + (defaultPosition / 2) - barHeight
      if (pos < defaultUpperThreshold) {
        return 'max'
      } else if (pos > defaultLowerThreshold) {
        return 'map'
      } else {
        return 'default'
      }
    } else if (this.state.cardPosition === 'default') {
      const defaultUpperThreshold = defaultPosition / 2 * -1
      const defaultLowerThreshold = defaultPosition / 2
      if (pos < defaultUpperThreshold) {
        return 'max'
      } else if (pos > defaultLowerThreshold) {
        return 'map'
      } else {
        return  'default'
      }
    } else if (this.state.cardPosition === 'map') {
      // does my brain in less if we just use positive numbers
      pos = Math.abs(pos) 
      const defaultThreshold =  defaultPosition - barHeight
      const defaultUpperThreshold = defaultThreshold / 2
      const defaultLowerThreshold = defaultThreshold + (defaultPosition / 2) - barHeight
      if (pos < defaultUpperThreshold) {
        return 'map'
      } else if (pos > defaultLowerThreshold) {
        return 'max'
      } else {
        return 'default'
      }
    }
  }
  triggerTouchStart = e => {
    iOS.triggerStart(e, 'bottom')
    // only start the pull down if they're at the top of the card
    if (this.touchcard.scrollTop === 0 && window.innerWidth < 851) {
      this.touchstartpos = e.touches[0].clientY
      this.fakestartpos = e.touches[0].clientY
      this.touchlastpos = e.touches[0].clientY

      this.scrolllock = null
      this.clientHeight = document.documentElement.clientHeight
      this.windowHeight = this.clientHeight / 2
      this.cardHeight = e.currentTarget.offsetHeight - maxPosition - barHeight

      // kill transition
      this.touchcard.style.transition = 'initial'

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
    if (this.state.cardPosition === 'map' && this.touchcard.scrollTop !== 0) {
      this.touchcard.scrollTop = 0
    }
  }
  triggerTouchMove = e => {
    // cancels if they're not at the top of the card
    if (this.touchstartpos === null) {
      return
    }

    // todo animate between first touchstart & touchmove
    const scrollLogic = () => {
      if (this.scrolllock === true) {
        let offset = e.changedTouches[0].clientY - this.fakestartpos
        let lowerLimit = 0
        let upperLimit = this.cardHeight
        if (this.state.cardPosition === 'map') {
          offset = offset + this.cardHeight + barHeight
          // TODO: Magic Numbers?!
          upperLimit = this.cardHeight + maxPosition - 25
        } else if (this.state.cardPosition === 'default') {
          offset = offset + this.cardHeight - defaultPosition + paddingHeight 
        }

        // limits from scrolling over start or end
        if (offset < lowerLimit) {
          offset = lowerLimit
        } else if (offset > upperLimit) {
          offset = upperLimit
        }

        // stores last touch position for use on touchend to detect flick
        this.touchlastpos = e.changedTouches[0].clientY

        const cardtransform = `translate3d(0,${offset}px,0)`
        requestAnimationFrame(() => {
          this.touchcard.style.transform = cardtransform
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
    if (this.state.cardPosition === 'map') {
      equality = this.touchstartpos < newPos
      // this is like scrolling up on the bar - stops the scroll on body in iOS
      if (equality && iOS.detect()) {
        e.preventDefault()
      }
    } else if (this.state.cardPosition === 'map') {
      equality = this.touchstartpos > newPos
    }

    if (equality === false) {
      this.scrolllock = true

      // eliminiate the janky feel
      this.fakestartpos = newPos + (this.state.cardPosition === 'map' ? -1 : 1)
      scrollLogic()
    } else {
      this.scrolllock = false
    }
  }
  triggerTouchEnd = e => {
    // cancels if the event never started
    if (this.touchstartpos === null || this.scrolllock === false) {
      return
    }

    // detects if they've scrolled over halfway
    if (this.longtouch === true) {
      let threshold = Math.round(
        (e.currentTarget.offsetHeight - maxPosition - barHeight) / 2
      )
      if (this.state.cardPosition === 'map') {
        threshold = e.currentTarget.offsetHeight / 2
      } else {
        // stops from scrolling down if they're halfway down the page
        if (this.touchcard.scrollTop !== 0) {
          return
        }
      }
      const touchDelta = e.changedTouches[0].clientY - this.touchstartpos
      const snapped = this.snapToWhat(touchDelta)
      // hacks to make it not slow on slow device
      if (snapped !== this.state.cardPosition) {
        this.rootcontainer.className = `root-container ${snapped}-view`
        setTimeout(() => {
          this.toggleStations(snapped)
        }, animationSpeed)
      }
      // detects a flickss
    } else if (
      this.longtouch === false &&
      Math.abs(this.touchstartpos - this.touchlastpos) > 15
    ) {
      // hacks to make it not slow on slow devices
      let finalView = ''
      if (this.state.cardPosition === 'map') {
        finalView = 'max'
      } else {
        finalView = 'map'
      }
      this.rootcontainer.className = `root-container ${finalView}-view`
      // special easing curve
      requestAnimationFrame(() => {
        this.touchcard.style.transition = `${animationSpeed}ms ease-out transform`
        this.touchcard.style.transform = ''
      })
      setTimeout(() => {
        this.toggleStations(finalView)
        requestAnimationFrame(() => {
          this.touchcard.style.transition = ''
        })
      }, 275)
      return
    }
    requestAnimationFrame(() => {
      this.touchcard.style.transition = ''
      this.touchcard.style.transform = ''
    })
  }
  triggerScroll = e => {
    if (
      (e.currentTarget.scrollTop === 0 && this.panLock === false) ||
      (e.currentTarget.scrollTop !== 0 && this.panLock === true)
    ) {
      this.panLock = !this.panLock

      requestAnimationFrame(() => {
        if (this.panLock) {
          this.touchcard.classList.add('pan-lock')
        } else {
          this.touchcard.classList.remove('pan-lock')
        }
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

    const pin = this.state.showPin ? <Pin onHide={this.togglePin} /> : null

    const rootClassName =
      'root-container ' + this.state.cardPosition + '-view'

    return (
      <div className={className}>
        <div className={rootClassName} ref={e => (this.rootcontainer = e)}>
          <RootHeader
            region={this.state.region}
            toggleRegion={this.toggleRegion}
          />
          <div className="root-map">
            <MapView />
          </div>
          <div
            className="root-card enable-scrolling pan-lock"
            ref={e => (this.touchcard = e)}
            onTouchStart={this.triggerTouchStart}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
          >
            <div
              className="root-card-padding-button"
              onTouchTap={this.toggleStations}
            />
            <ContentView
              rootComponent={() => (
                <Root
                  togglePin={this.togglePin}
                  toggleStations={this.toggleStations}
                  toggleRegion={this.toggleRegion}
                />
              )}
            />
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