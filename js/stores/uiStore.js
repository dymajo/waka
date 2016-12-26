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
      lastUrl: '',
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
    } else if (this.state.lastUrl === path) {
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
  }
  handleState(e) { 
    this.state.lastUrl = window.location.pathname
  }
  currentState(e) { 
    this.state.currentUrl = window.location.pathname
    localStorage.setItem('CurrentUrl', this.state.currentUrl)
  }
  handleReactChange(prevState, nextState, replace, callback) {
    // don't run the back animation if it's just in normal ios
    if (iOS.detect() && !window.navigator.standalone && !this.state.triggeredBack) {
      return callback()
    }
    var p = nextState.location.pathname
    var sp = p.split('/')
    if ((nextState.location.action == 'POP' && sp.length === 2) || this.state.triggeredBack) {
      if (this.state.noAnimate === true) {
        // runs cb with delay for animation to finish
        setTimeout(function() {
          callback()
        }, 500)
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
      }, 550)
    } else {
      callback()
    }
  }
}

export let UiStore = new uiStore()