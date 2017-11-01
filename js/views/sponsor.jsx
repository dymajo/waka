import React from 'react'
import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'
import BackGesture from './back-gesture.jsx'

import Header from './header.jsx'
const style = UiStore.getAnimation()

class Sponsor extends React.Component {
  state = {
    animation: 'unmounted'
  }

  componentDidMount() {
    document.title = t('sponsor.title') + ' - ' + t('app.name')
    this.gesture = new BackGesture({
      container: this.container,
      history: this.props.history,
    })
    this.gesture.bindEvents()

    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    this.gesture.unbindEvents()
    UiStore.unbind('animation', this.animation)
  }
  animation = (data) => {
    if (data[1] !== this.container || this.gesture.animationOverride === true) {
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

  render() {
    return(
      <div className="default-container" ref={e => this.container = e} style={style[this.state.animation]}>
        <Header title={t('sponsor.title')} />
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