import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'

export default class BackGesture {
  animationOverride = false
  longTouch = false

  constructor(props) {
    this.container = props.container
    this.history = props.history
  }
  bindEvents() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.addEventListener('touchstart', this.triggerTouchStart)
      this.container.addEventListener('touchmove', this.triggerTouchMove)
      this.container.addEventListener('touchend', this.triggerTouchEnd)
      this.container.addEventListener('touchcancel', this.triggerTouchEnd)
    }
  }
  unbindEvents() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.removeEventListener('touchstart', this.triggerTouchStart)
      this.container.removeEventListener('touchmove', this.triggerTouchMove)
      this.container.removeEventListener('touchend', this.triggerTouchEnd)
      this.container.removeEventListener('touchcancel', this.triggerTouchEnd)
    }
  }
  triggerTouchStart = (event) => {
    if (window.innerWidth > 850) {
      return
    }
    // This is a hack to detect flicks  
    this.longTouch = false
    setTimeout(() => {
      this.longTouch = true
    }, 250)

    this.touchStartPos = event.touches[0].pageX
  }
  triggerTouchMove = (event) => {
    if (window.innerWidth > 850) {
      return
    }
    if (this.touchStartPos <= 7) {
      event.preventDefault()
      this.newPos = Math.max(event.touches[0].pageX - this.touchStartPos, 0)
      this.container.setAttribute('style', 'transform: translate3d('+this.newPos+'px,0,0);')
    }
  }
  triggerTouchEnd = () => {
    if (window.innerWidth > 850) {
      return
    }
    if (this.touchStartPos <= 7) {
      this.touchStartPos = 100
      let swipedAway = false
      if (this.newPos > window.innerWidth/2 || this.longTouch === false) {
        // rejects touches that don't really move
        if (this.newPos > 3) {
          swipedAway = true
        }
      }
      if (swipedAway) {
        // navigate backwards with no animate flag
        this.animationOverride = true
        UiStore.goBack(this.history, '/', true)
        this.container.setAttribute('style', 'transform: translate3d(100vw,0,0);transition: transform 0.3s ease-out;')
      } else {
        this.container.setAttribute('style', 'transform: translate3d(0px,0,0);transition: transform 0.3s ease-out;')
      }
    }
  }
}