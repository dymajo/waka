import createHistory from 'history/createBrowserHistory'

import Events from './Events'
import { iOS } from '../helpers/ios.js'

class UIStore extends Events {
  constructor(props) {
    super(props)
    this.state = {
      totalNavigations: 0,
      currentUrl: null,
      mapView: false, // deprecated
      exiting: window.location.pathname, // deprecated
      downloadedCss: {}, // deprecated
      scrollPosition: 0,

      // base map stuff
      basemap: null,
      basemapType: 'leaflet',

      // root card positions
      oldCardPosition: 'default',
      cardPosition: 'default',

      // used for proper touch rejection
      headerEvent: null,

      // animation directions
      suggestedPopTransition: 'backward',
      forcedPopTransition: null,

      suggestedPushTransition: 'forward',
      forcedPushTransition: null,

      lastTransition: 'forward',
    }

    // allows stuff in the class to use the history - push and pop
    const customHistory = createHistory()
    const historyTracker = [customHistory.location.key]

    // just in case we need access to these objects later
    this.customHistory = customHistory
    this.historyTracker = historyTracker

    // this ensures we always have the right animations
    const state = this.state
    customHistory.listen((event, action) => {
      state.currentUrl = event.pathname
      this.state.totalNavigations++

      if (action === 'PUSH') {
        historyTracker.push(event.key)

        // usually always forward
        state.suggestedPushTransition = 'forward'
        if (state.forcedPushTransition) {
          state.suggestedPushTransition = state.forcedPushTransition
          state.forcedPushTransition = null
        }
        state.lastTransition = state.suggestedPushTransition
      } else if (action === 'POP') {
        // array indexing - 1
        let suggestedPopTransition = 'backward'
        const previousLocationKey = historyTracker[historyTracker.length - 2]
        if (previousLocationKey === event.key) {
          historyTracker.pop()
        } else {
          suggestedPopTransition = 'forward'
          historyTracker.push(event.key)
        }
        // if there's an animation wanted, it ensures that the correct one is used
        state.suggestedPopTransition = suggestedPopTransition
        if (state.forcedPopTransition) {
          state.suggestedPopTransition = state.forcedPopTransition
          state.forcedPopTransition = null
        }
        state.lastTransition = state.suggestedPopTransition
      } else if (action === 'REPLACE') {
        historyTracker[historyTracker.length - 1] = event.key
        state.lastTransition = 'fade-forward'
      }
    })
  }

  // at the moment you can't go up a level
  safePush = relativeUrl => {
    const url =
      relativeUrl[0] === '.'
        ? this.customHistory.location.pathname.replace(/\/$/, '') +
          relativeUrl.slice(1)
        : relativeUrl

    if (url !== this.customHistory.location.pathname) {
      this.customHistory.push(url)
    }
  }

  stopVisibility(visible) {
    this.trigger('stop-visibility', visible)
  }

  setCardPosition(position, animate = true, manual = false) {
    // don't need to do anything if it's already in the right position
    if (this.state.cardPosition === position) {
      return
    }
    if (position === 'toggle') {
      if (this.state.cardPosition === 'default') {
        position = 'map'
      } else if (this.state.cardPosition === 'max') {
        position = 'default'
      } else if (this.state.cardPosition === 'map') {
        position = 'default'
      }
    }
    this.state.cardPosition = position
    this.trigger('card-position', position, animate, manual)
    if (animate === true) {
      setTimeout(() => {
        this.state.oldCardPosition = position
      }, 200)
    } else {
      this.state.oldCardPosition = position
    }
  }

  setExpandedItem(name) {
    this.trigger('expandChange', name)
  }

  goBack = (path, noAnimate = false) => {
    if (window.location.pathname === path) {
    } else if (this.state.totalNavigations > 0) {
      this.state.forcedPopTransition = 'backward'
      this.customHistory.goBack()
    } else {
      this.state.forcedPushTransition = 'backward'
      this.customHistory.push(path)
    }
  }
}
export default new UIStore()
