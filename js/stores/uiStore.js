import createHistory from 'history/createBrowserHistory'

import Events from './events'
import { iOS } from '../models/ios.js'

class uiStore extends Events {
  constructor(props) {
    super(props)
    this.state = {
      totalNavigations: 0,
      currentUrl: null,
      mapView: false, // deprecated
      exiting: window.location.pathname, // deprecated
      downloadedCss: {}, // deprecated
      scrollPosition: 0,

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

    // restores history if it's an iphone web clip :/
    // if (window.navigator.standalone) {
    //   if (localStorage.getItem('CurrentUrl')) {
    //     this.state.currentUrl = localStorage.getItem('CurrentUrl')
    //   }
    // }

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
  setCardPosition(position, animate = true) {
    this.state.cardPosition = position
    this.trigger('card-position', position, animate)
    setTimeout(() => {
      this.state.oldCardPosition = position
    }, 200)
  }
  downloadCss(file) {
    if (file in this.state.downloadedCss) {
      return
    }
    fetch('/assets.json').then(response => {
      response.json().then(data => {
        const link = document.createElement('link')
        link.setAttribute('rel', 'stylesheet')
        link.setAttribute('href', '/' + data[file])
        const ref = document.querySelector('link')
        ref.parentNode.insertBefore(link, ref)
        this.state.downloadedCss[file] = link
      })
    })
  }
  setExpandedItem(name) {
    this.trigger('expandChange', name)
  }
  getState() {
    return this.state
  }
  getAnimation(styleType) {
    if (iOS.detect() && window.innerWidth <= 850) {
      return {
        entering: {
          animation: '250ms ss-to-stop-station-ios ease 1',
          zIndex: 5,
        },
        exiting: {
          animation: '250ms stop-to-ss-station-ios ease 1',
          transform: 'translate3d(100vw,0,0)',
          pointerEvents: 'none',
        },
      }
    }
    return {
      entering: {
        animation: '250ms ss-to-stop-station ease 1',
        zIndex: 5,
      },
      exiting: {
        animation: '250ms stop-to-ss-station ease 1',
        transform: 'translate3d(0,15px,0)',
        opacity: '0',
        pointerEvents: 'none',
      },
    }
  }
  goBack = (path, noAnimate = false) => {
    if (window.location.pathname === path) {
      return
    } else if (this.state.totalNavigations > 0) {
      this.state.forcedPopTransition = 'backward'
      this.customHistory.goBack()
    } else {
      this.state.forcedPushTransition = 'backward'
      this.customHistory.push(path)
    }
  }
}
export let UiStore = new uiStore()
