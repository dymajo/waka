import Events from './events'
import { iOS } from '../models/ios.js'

export class uiStore extends Events {
  constructor(props) {
    super(props)
    this.state = {
      canAnimate: false,
      totalNavigations: 0,
      lastUrl: null,
      currentUrl: null,
      mapView: false,
      fancyMode: false,
      exiting: window.location.pathname
    }

    // restores history if it's an iphone web clip :/
    if (window.navigator.standalone) {
      if (localStorage.getItem('CurrentUrl')) {
        this.state.currentUrl = localStorage.getItem('CurrentUrl')
      }
    }
    // if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    //   if (this.state.currentUrl === null) {
    //     this.browserHistory.push('/')
    //   } else if (this.state.currentUrl !== window.location.pathname) {
    //     this.browserHistory.push(this.state.currentUrl)
    //   }
    // }
  }

  handleState = () => {
    this.state.totalNavigations++
    this.state.lastUrl = this.state.currentUrl
    this.state.currentUrl = window.location.pathname
  }

  setExpandedItem(name) { 
    this.trigger('expandChange', name)
  }
  getState() {
    return this.state
  }
  getAnimation(styleType) {
    if (styleType === 'fancy') {
      return {
        entering: {
          animation: '250ms ss-to-stop-station ease 1'
        },
        exiting: {
          animation: '250ms stop-to-ss-station ease 1',
          transform: 'translate3d(0,15px,0)',
          opacity: '0',
          pointerEvents: 'none',
        }
      }
    }
    if (iOS.detect()) {
      return {
        entering: {
          animation: '250ms ss-to-stop-station-ios ease 1',
        },
        exiting: {
          animation: '250ms stop-to-ss-station-ios ease 1',
          transform: 'translate3d(100vw,0,0)',
          pointerEvents: 'none',
        }
      }
    }
    return {
      entering: {
        animation: '250ms ss-to-stop-station ease 1',
      },
      exiting: {
        animation: '250ms stop-to-ss-station ease 1',
        transform: 'translate3d(0,15px,0)',
        opacity: '0',
        pointerEvents: 'none',
      }
    }
  }
  goBack = (history, path, noAnimate = false) => {
    if (window.location.pathname === path) {
      return
    } else if (this.state.totalNavigations > 0) {
      history.goBack()
    } else {
      history.push(path)
    }
  }
}
export let UiStore = new uiStore()