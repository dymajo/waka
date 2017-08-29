import React from 'react'
import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'

import BackIcon from '../../dist/icons/back.svg'
const style = UiStore.getAnimation()

class Sponsor extends React.Component {
  state = {
    animation: 'unmounted'
  }
  animationOverride = false

  componentDidMount() {
    document.title = t('sponsor.title') + ' - ' + t('app.name')
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.addEventListener('touchstart', this.triggerTouchStart)
      this.container.addEventListener('touchmove', this.triggerTouchMove)
      this.container.addEventListener('touchend', this.triggerTouchEnd)
      this.container.addEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    if (iOS.detect() && window.navigator.standalone === true) {
      this.container.removeEventListener('touchstart', this.triggerTouchStart)
      this.container.removeEventListener('touchmove', this.triggerTouchMove)
      this.container.removeEventListener('touchend', this.triggerTouchEnd)
      this.container.removeEventListener('touchcancel', this.triggerTouchEnd)
    }
    UiStore.unbind('animation', this.animation)
  }
  animation = (data) => {
    if (data[1] !== this.container || this.animationOverride === true) {
      return
    // doesn't run if we're decending from down the tree up
    } else if (data[0] === 'exiting' && window.location.pathname !== '/') {
      return
    } else {
      this.setState({
        animation: data[0]
      })
    }
  }

  triggerTouchStart = (event) => {
    // This is a hack to detect flicks  
    this.longTouch = false
    setTimeout(() => {
      this.longTouch = true
    }, 250)

    this.touchStartPos = event.touches[0].pageX
  }
  triggerTouchMove = (event) => {
    if (this.touchStartPos <= 7) {
      event.preventDefault()
      this.newPos = Math.max(event.touches[0].pageX - this.touchStartPos, 0)
      this.container.setAttribute('style', 'transform: translate3d('+this.newPos+'px,0,0);')
    }
  }
  triggerTouchEnd = () => {
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
        UiStore.goBack(this.props.history, '/', true)
        this.container.setAttribute('style', 'transform: translate3d(100vw,0,0);transition: transform 0.3s ease-out;')
      } else {
        this.container.setAttribute('style', 'transform: translate3d(0px,0,0);transition: transform 0.3s ease-out;')
      }
    }
  }

  triggerBack = () => {
    UiStore.goBack(this.props.history, '/')
  }

  render() {
    return(
      <div className="settingsContainer" ref={e => this.container = e} style={style[this.state.animation]}>
        <header className='material-header'>
          <span className="header-left" onTouchTap={this.triggerBack}>
            <BackIcon/>
          </span>
          <div className="header-content">
            <h1>{t('sponsor.title')}</h1>
          </div>
        </header>
        <div className="settings enable-scrolling" onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            <h2>{t('sponsor.slug', {appname: t('app.name')})}<br />{t('sponsor.slug2')}</h2>
            <h1>{t('sponsor.sponsorTitle')}</h1>
            <p>{t('sponsor.sponsorDescription')}</p>
            <a target="_blank" rel="noopener noreferrer" href="mailto:hello@dymajo.com" className="nice-button primary">{t('sponsor.email')}</a>
            <h1>{t('sponsor.patreonTitle')}</h1>
            <p>{t('sponsor.patreonDescription')}</p>
            <a target="_blank" rel="noopener noreferrer" href="https://patreon.com/dymajo" className="nice-button primary">Patreon</a>
            <h1>{t('sponsor.contributeTitle')}</h1>
            <p>{t('sponsor.contributeDescription', {appname: t('app.name')})}</p>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/consindo/dymajo-transit" className="nice-button primary">GitHub</a>
            <h1>{t('sponsor.translateTitle')}</h1>
            <p>{t('sponsor.translateDescription', {appname: t('app.name')})}</p>
            <a target="_blank" rel="noopener noreferrer" href="mailto:hello@dymajo.com" className="nice-button primary">{t('sponsor.email')}</a>
          </div>
        </div>
      </div>
    )
  }
}
export default Sponsor