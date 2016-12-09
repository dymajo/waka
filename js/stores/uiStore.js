import Events from './events'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'

export class UiStore extends Events {
  constructor(props) {
    super(props)
    this.state = {
      triggeredBack: false,
      noAnimate: false,
      goingBack: false,
      lastUrl: '',
      currentUrl: '/ss'
    }
    // restores history if it's an iphone web clip :/
    if (window.navigator.standalone) {
      if (localStorage.getItem('CurrentUrl')) {
        state.currentUrl = localStorage.getItem('CurrentUrl')
      }
    }
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      browserHistory.push(state.currentUrl)
    }
  }
  getState() {
    return state
  }
  navigateSavedStations(path, noAnimate) {
    if (window.location.pathname === path) {
      return
    } else if (state.lastUrl === path) {
      state.triggeredBack = true
      state.noAnimate = noAnimate
      browserHistory.goBack()
      setTimeout(function() {
        state.noAnimate = false
        state.triggeredBack = false
      }, 300)
    } else {
      // first run maybe?
      state.triggeredBack = true
      state.noAnimate = noAnimate
      browserHistory.push(path)
      setTimeout(function() {
        state.noAnimate = false
        state.triggeredBack = false
      }, 300)
    }
  }
  handleState(e) { 
    state.lastUrl = window.location.pathname
  }
  currentState(e) { 
    state.currentUrl = window.location.pathname
    localStorage.setItem('CurrentUrl', state.currentUrl)
  }
  handleReactChange(prevState, nextState, replace, callback) {
    // don't run the back animation if it's just in normal ios
    if (iOS.detect() && !window.navigator.standalone && !state.triggeredBack) {
      return callback()
    }
    var p = nextState.location.pathname
    var sp = p.split('/')
    if ((nextState.location.action == 'POP' && ((sp[1] == 'cf' && sp.length === 3) || sp.length === 2)) || state.triggeredBack) {
      if (state.noAnimate === true) {
        // runs cb with delay for animation to finish
        setTimeout(function() {
          callback()
        }, 500)
        return
      }
      state.goingBack = true
      UiStore.trigger('goingBack')

      setTimeout(function() {
        requestAnimationFrame(function() {
          callback()
          state.goingBack = false
          UiStore.trigger('goingBack')
        })
      }, 550)
    } else {
      callback()
    }
  }
}
browserHistory.listenBefore(UiStore.handleState)
browserHistory.listen(UiStore.currentState)

export let uistore = new UiStore()