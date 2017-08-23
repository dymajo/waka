import React from 'react'
import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import Toggle from './toggle.jsx'

const authors = [
  ['https://jono.nz', 'Jono Cooper',  'Design, Code'],
  ['http://mattdavidson.kiwi', 'Matt Davidson',  'Code'],
  ['https://twitter.com/itemic', 'Terran Kroft',  'Testing, Feedback'],
  ['https://github.com/blackdragon723', 'Dylan Wragge',  'Testing, Feedback'],
  ['http://www.generationzero.org/', 'Generation Zero',  'Artwork'],
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
    document.title = 'Settings - Transit'
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
      return <li key={key}><a target="_blank" rel="noopener" href={item[0]}>{item[1]}</a> &ndash; {item[2]}</li>
    }))}</ul>
  }

  render() {

    var button
    var className = 'creditscontainer'
    if (this.state.credits) {
      className += ' visible'
    } else {
      button = <button onTouchTap={this.triggerCredits}><img src="icons/credits.svg" />View Credits</button>
    }

    return(
      <div className="settingsContainer" ref={e => this.container = e} style={style[this.state.animation]}>
        <header className='material-header'>
          <span className="header-left" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
          <div className="header-content">
            <h1>Settings</h1>
          </div>
        </header>
        <div className="settings enable-scrolling" onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            <div className="logobox">
              <div className="logo" id="logo">
                <span className="company">Dymajo </span>
                <span className="app">Transit </span>
                <span className="version">v{localStorage.getItem('AppVersion')}</span>
              </div>
              <div className="copyright"><a className="subtle" rel="noopener noreferrer" href="https://dymajo.com" target="_blank">&copy; 2016 - 2017 DYMAJO LTD</a></div>
              <div className="sourcecode">This app is licensed under the <a className="subtle" rel="noopener noreferrer" href="https://github.com/consindo/dymajo-transit/blob/master/LICENSE" target="_blank">MIT License</a>.<br />
              Contributions are welcome!<br /><a href="https://github.com/consindo/dymajo-transit" rel="noopener noreferrer" target="_blank">github.com/consindo/dymajo-transit</a></div>
            </div>
            <div className="container">
              <h1>Settings</h1>
              <Toggle id="clock">
                <img src="/icons/clock.svg" />
                24hr Time
              </Toggle>
              <Toggle id="longName">
                <img src="/icons/longnames.svg" />
                Long Route Names
              </Toggle>
              <h1>More</h1>
              <div className="credits">
                <a className="button" href="mailto:hello@dymajo.com">
                  <img src="/icons/feedback.svg" />
                  Send Feedback
                </a>
                <a className="button" rel="noopener noreferrer" href="https://twitter.com/dymajoltd" target="_blank">
                  <img src="/icons/twitter.svg" style={{margin: '-6px 3px -6px -6px', width: '36px'}} />
                  Twitter
                </a>
                {button}
                <div className={className}>
                  <p>A number of people helped design, develop, and influence Transit.</p>
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