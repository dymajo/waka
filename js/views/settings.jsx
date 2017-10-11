import React from 'react'
import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import Toggle from './toggle.jsx'
import { t } from '../stores/translationStore.js'

import BackIcon from '../../dist/icons/back.svg'
import ClockIcon from '../../dist/icons/clock.svg'
import LongnamesIcon from '../../dist/icons/longnames.svg'
import FeedbackIcon from '../../dist/icons/feedback.svg'
import CreditsIcon from '../../dist/icons/credits.svg'

const authors = [
  ['https://jono.nz', 'Jono Cooper',  'Design, Code'],
  ['http://mattdavidson.kiwi', 'Matt Davidson',  'Code'],
  ['https://twitter.com/itemic', 'Terran Kroft',  'Testing, Feedback'],
  ['https://github.com/blackdragon723', 'Dylan Wragge',  'Testing, Feedback'],
  ['http://www.generationzero.org/', 'Generation Zero',  'Artwork'],
  ['https://twitter.com/pcman2000', 'Edward Zhang',  'Photography - Auckland'],
  ['http://www.jeffsmithphotography.co.nz/', 'Jeff Smith',  'Photography - Wellington'],
]
const apis = [
  ['https://at.govt.nz', 'Auckland Transport', 'API Usage'],
  ['https://azure.microsoft.com', 'Microsoft Azure', 'Application Server'],
  ['https://github.com', 'GitHub', 'Project Hosting'],
  ['https://www.openstreetmap.org/', 'OpenStreetMap', 'Map Data'],
  ['https://material.io/icons/', 'Material Design', 'Icons'],
]

const style = UiStore.getAnimation()

class Settings extends React.Component {
  state = {
    credits: false,
    animation: 'unmounted'
  }
  animationOverride = false

  componentDidMount() {
    document.title = t('settings.title') + ' - ' + t('app.name')
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

  triggerCredits = () => {
    this.setState({
      credits: true
    })
  }

  renderLinks(items) {
    return <ul>{items.map((function(item, key) {
      return <li key={key}><a target="_blank" rel="noopener noreferrer" href={item[0]}>{item[1]}</a> &ndash; {item[2]}</li>
    }))}</ul>
  }

  render() {

    var button
    var className = 'creditscontainer'
    if (this.state.credits) {
      className += ' visible'
    } else {
      button = <button onTouchTap={this.triggerCredits}><CreditsIcon />{t('settings.more.credits')}</button>
    }

    return(
      <div className="settingsContainer" ref={e => this.container = e} style={style[this.state.animation]}>
        <header className='material-header'>
          <span className="header-left" onTouchTap={this.triggerBack}>
            <BackIcon/>
          </span>
          <div className="header-content">
            <h1>{t('settings.title')}</h1>
          </div>
        </header>
        <div className="settings enable-scrolling" onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            <div className="logobox">
              <div className="logo" id="logo">
                <span className="company">Dymajo </span>
                <span className="app">{t('app.name')} </span>
                <span className="version">v{localStorage.getItem('AppVersion')}</span>
              </div>
              <div className="copyright"><a className="subtle" rel="noopener noreferrer" href="https://dymajo.com" target="_blank">&copy; 2016 - 2017 DYMAJO LTD</a></div>
              <div className="sourcecode">{t('settings.license')}<br />
                {t('settings.contributions')}<br /><a href="https://github.com/consindo/dymajo-transit" rel="noopener noreferrer" target="_blank">github.com/consindo/dymajo-transit</a></div>
            </div>
            <div className="container">
              <h1>{t('settings.preferences.title')}</h1>
              <Toggle id="clock">
                <ClockIcon />
                {t('settings.preferences.hrs')}
              </Toggle>
              <Toggle id="longName">
                <LongnamesIcon />
                {t('settings.preferences.longnames')}
              </Toggle>
              <h1>{t('settings.more.title')}</h1>
              <div className="credits">
                <a className="button" href="mailto:hello@dymajo.com">
                  <FeedbackIcon />
                  {t('settings.more.feedback')}
                </a>
                {button}
                <div className={className}>
                  <p>A number of people helped design, develop, and influence Waka.</p>
                  {this.renderLinks(authors)}
                  <h3>Special Thanks</h3>
                  <p>These are great things that are free, and we love them.</p>
                  {this.renderLinks(apis)}
                  <div className="love">Made with 💙 in Auckland NZ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
export default Settings