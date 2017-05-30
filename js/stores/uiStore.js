import Events from './events'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'

export class uiStore extends Events {
  constructor(props) {
    super(props)
    this.state = {
      canAnimate: false,
      triggeredBack: false,
      noAnimate: false,
      goingBack: false,
      totalNavigations: 0,
      currentUrl: null,
      lastUrl: null,
      oldNavigate: [],
      mapView: false,
      fancyMode: false,
    }
    // constant used for setTimeouts
    this.animationTiming = 250 + 25

    // restores history if it's an iphone web clip :/
    if (window.navigator.standalone) {
      if (localStorage.getItem('CurrentUrl')) {
        this.state.currentUrl = localStorage.getItem('CurrentUrl')
      }
    }
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      if (this.state.currentUrl === null) {
        browserHistory.push('/')
      } else if (this.state.currentUrl !== window.location.pathname) {
        browserHistory.push(this.state.currentUrl)
      }
    }
    browserHistory.listenBefore(this.handleState.bind(this))
    browserHistory.listen(this.currentState.bind(this))

    this.handleReactChange = this.handleReactChange.bind(this)

    setTimeout(() => {
      this.state.canAnimate = true
    }, this.animationTiming * 3)
  }
  setExpandedItem(name) { 
    this.trigger('expandChange', name)
  }
  getState() {
    return this.state
  }
  getAnimationIn() {
    if (this.state.canAnimate === false) {
      return null
    } else if (iOS.detect()) {
      return '250ms ss-to-stop-station-ios ease 1'
    }
    return '250ms ss-to-stop-station ease 1'
  }
  getAnimationOut() {
    if (this.state.canAnimate === false) {
      return null
    } else if (iOS.detect()) {
      return {
        animation: '250ms stop-to-ss-station-ios ease 1',
        transform: 'translate3d(100vw,0,0)',
      }
    }
    return {
      animation: '250ms stop-to-ss-station ease 1',
      transform: 'translate3d(0,15px,0)',
      opacity: '0',
      pointerEvents: 'none',
    }
  }
  getModalAnimationIn() {
    if (this.state.canAnimate === false) {
      return null
    }
    return '250ms ss-to-stop-station ease 1'
  }
  getModalAnimationOut() {
    if (this.state.canAnimate === false) {
      return null
    }
    return {
      animation: '250ms stop-to-ss-station ease 1',
      transform: 'translate3d(0,15px,0)',
      opacity: '0',
      pointerEvents: 'none',
    }
  }
  navigateSavedStations(path, noAnimate) {
    if (window.location.pathname === path) {
      return
    } else if (this.state.totalNavigations > 0) {
      this.state.triggeredBack = true
      this.state.noAnimate = noAnimate
      browserHistory.goBack()
      setTimeout(() => {
        this.state.noAnimate = false
        this.state.triggeredBack = false
      }, 300)
    } else {
      // first run maybe?
      this.state.triggeredBack = true
      this.state.noAnimate = noAnimate
      browserHistory.push(path)
      setTimeout(() => {
        this.state.noAnimate = false
        this.state.triggeredBack = false
      }, 300)
    }
    // handle state picks up back and forwards, so, you have to subtract two
    this.state.totalNavigations = this.state.totalNavigations - 2
  }
  handleState(e) {
    this.state.totalNavigations++
  }
  currentState(e) {
    this.state.lastUrl = this.state.currentUrl
    this.state.currentUrl = window.location.pathname
    localStorage.setItem('CurrentUrl', window.location.pathname.split('/').slice(0,3).join('/'))
  }
  handleReactChange(prevState, nextState, replace, callback) {
    var p = prevState.location.pathname
    var n = nextState.location.pathname

    // we're going to where we want to go...
    if (n.split('/')[1] === 's' && n.split('/').length === 3) {
      if (nextState.location.action == 'PUSH') {
        // failsafe?s
        if (p !== '/' && p !== '/settings') {
          this.state.oldNavigate.push(p)  
        }
      }
    } else if (p.split('/')[1] === 's' && p.split('/').length === 3) {
      if (nextState.location.action == 'POP') {
        this.state.oldNavigate.pop()
      }
    }
    
    // weird state changes not back or forward just weird
    const isNoWayGoingBack = n.split('/')[1] !== p.split('/')[1] && n.length > 2 && p.length > 2
    if (isNoWayGoingBack) {
      // all this mess for the backswipe on stations
      // on ios standalone mode
      if (iOS.detect() && window.navigator.standalone && nextState.location.action === 'POP' && this.state.noAnimate === true) {
        setTimeout(function() {
          callback()
        }, 255)
        return
      } else {
        return callback()
      }
    }
    // don't run the back animation if it's just in normal ios
    if (iOS.detect() && !window.navigator.standalone && !this.state.triggeredBack) {
      return callback()
    }
    // custom hacked logic for the stations weirdness animation emulation
    const isGoingBackKinda = (n.split('/').length < p.split('/').length) && n.split('/')[1] === p.split('/')[1]
    if ((((nextState.location.action == 'POP') || this.state.triggeredBack) && (n.split('/').length <= p.split('/').length && p.length > 1)) || isGoingBackKinda) {
      if (this.state.noAnimate === true) {
        // runs cb with delay for animation to finish
        setTimeout(function() {
          callback()
        }, 275)
        return
      }
      this.state.goingBack = true
      UiStore.trigger('goingBack')

      setTimeout(() => {
        requestAnimationFrame(() => {
          callback()
          this.state.goingBack = false
          UiStore.trigger('goingBack')
        })
      }, 300)
    } else {
      callback()
    }
  }
}
export let UiStore = new uiStore()