import React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'
import { StationStore, StationMap } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

const paddingHeight = 200
const barHeight = 64

class Index extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      mapView: false
    }

    this.touchstartpos = null
    this.scrolllock = false

    this.toggleStations = this.toggleStations.bind(this)
    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchMove = this.triggerTouchMove.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)
  }
  toggleStations() {
    requestAnimationFrame(() => {
      this.setState({
        mapView: !this.state.mapView
      })
    })
  }
  triggerTouchStart(e) {
    // only start the pull down if they're at the top of the card
    if (this.refs.touchcard.scrollTop === 0) {
      this.touchstartpos = e.touches[0].clientY
      this.scrolllock = null
      this.windowHeight = window.innerHeight / 2
      this.cardHeight = e.currentTarget.offsetHeight - paddingHeight - barHeight

      // kill the transition on this
      this.refs.touchcard.style.transition = 'initial'
      this.refs.touchmap.style.transition = 'initial'
    } else {
      this.touchstartpos = null
      this.scrolllock = null
    }
  }
  triggerTouchMove(e) {
    // cancels if they're not at the top of the card
    if (this.touchstartpos === null) {
      return
    }

    // todo animate between first touchstart & touchmove

    if (this.scrolllock === true) {
      // limits from scrolling over start or end
      let offset = e.changedTouches[0].clientY - this.touchstartpos
      if (offset < 0) {
        offset = 0
      } else if (offset > this.cardHeight) {
        offset = this.cardHeight
      }

      // calculates percentage of card height, and applies that to map transform
      let mapoffset = Math.round(offset / this.cardHeight * this.windowHeight * window.devicePixelRatio) / window.devicePixelRatio

      let cardtransform = `translate3d(0,${offset}px,0)`
      let maptransform = `translate3d(0,${mapoffset-this.windowHeight}px,0)`
      requestAnimationFrame(() => {
        this.refs.touchcard.style.transform = cardtransform
        this.refs.touchmap.style.transform = maptransform
      })
      e.preventDefault()
      return
    } else if (this.scrolllock === false) {
      // scrolling enabled, do nothing
      return
    }

    // if (this.refs.touchcard.scrollTop === 0) {
    let newPos = e.changedTouches[0].clientY
    if (this.touchstartpos < newPos) {
      this.scrolllock = true
    } else {
      this.scrolllock = false
    }
    // }
  }
  triggerTouchEnd(e) {
    // cancels if the event never started
    if (this.touchstartpos === null) {
      return
    }

    let threshold = Math.round((e.currentTarget.offsetHeight - paddingHeight - barHeight) / 2)
    let touchDelta = e.changedTouches[0].clientY - this.touchstartpos
    if (touchDelta > threshold) {
      this.toggleStations()
    }
    requestAnimationFrame(() => {
      this.refs.touchcard.style.transition = ''
      this.refs.touchcard.style.transform = ''
      this.refs.touchmap.style.transition = ''
      this.refs.touchmap.style.transform = ''
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
    let rootClassName = 'root-container'
    if (this.state.mapView) {
      rootClassName += ' map-view'
    }
    return (
      <div className={className}>
        <div className={rootClassName}>
          <header className="material-header">
            <div>
              <h1 className="full-height">
                <img className="logo" src='/icons/icon.png' width='16' />
                <strong>DYMAJO</strong> <span>Transit</span></h1>
            </div>
          </header>
          <div className="root-map"
            ref="touchmap"
          >
            Root Map.
          </div>
          <div className="root-card"
            ref="touchcard"
            onTouchStart={this.triggerTouchStart}
            onTouchMove={this.triggerTouchMove}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
          >
            <div className="root-card-bar">
              <button onClick={this.toggleStations}>Stations</button>
              <button>Lines</button>
              <button>Alerts</button>
            </div>
            <div className="root-card-content">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat.  
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