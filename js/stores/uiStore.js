import Events from './events'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'

export class uiStore extends Events {
  constructor(props) {
    super(props)
    this.state = {
      triggeredBack: false,
      noAnimate: false,
      goingBack: false,
      totalNavigations: 0,
      currentUrl: '/'
    }
    // restores history if it's an iphone web clip :/
    if (window.navigator.standalone) {
      if (localStorage.getItem('CurrentUrl')) {
        this.state.currentUrl = localStorage.getItem('CurrentUrl')
      }
    }
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      if (this.state.currentUrl !== window.location.pathname) {
        browserHistory.push(this.state.currentUrl)
      }
    }
    browserHistory.listenBefore(this.handleState.bind(this))
    browserHistory.listen(this.currentState.bind(this))

    this.handleReactChange = this.handleReactChange.bind(this)
  }
  getState() {
    return this.state
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
    this.state.totalNavigations = this.state.totalNavigations -1
  }
  handleState(e) { 
    this.state.totalNavigations++
  }
  currentState(e) { 
    this.state.currentUrl = window.location.pathname
    localStorage.setItem('CurrentUrl', this.state.currentUrl)
  }
  handleReactChange(prevState, nextState, replace, callback) {
    var p = prevState.location.pathname
    var n = nextState.location.pathname
    
    // weird state changes not back or forward just weird
    const isNoWayGoingBack = n.split('/')[1] !== p.split('/')[1] && n.length > 2 && p.length > 2
    if (isNoWayGoingBack) {
      return callback()
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