import React from 'react'
import { iOS } from '../models/ios.js'
import { UiStore } from '../stores/uiStore.js'
import Toggle from './toggle.jsx'

class Settings extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      credits: false
    }

    this.triggerCredits = this.triggerCredits.bind(this)
  }

  triggerBack() {
    UiStore.navigateSavedStations('/')
  }

  triggerCredits() {
    this.setState({
      credits: true
    })
  }

  render() {
    var button
    var className = 'creditscontainer'
    if (this.state.credits) {
      className += ' visible'
    } else {
      button = <button onTouchTap={this.triggerCredits}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/></svg>View Credits</button>
    }
    return(
      <div className="settingsContainer">
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
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
              <div className="copyright"><a className="subtle" rel="noopener" href="https://dymajo.com" target="_blank">&copy; 2016 DYMAJO LTD</a></div>
              <div className="sourcecode">This app is licensed under the <a className="subtle" rel="noopener" href="https://github.com/consindo/dymajo-transit/blob/master/LICENSE" target="_blank">MIT License</a>.<br />
              Contributions are welcome!<br /><a href="https://github.com/consindo/dymajo-transit" rel="noopener" target="_blank">github.com/consindo/dymajo-transit</a></div>
            </div>
            <div className="container">
              <h1>Settings</h1>
              <Toggle id="clock">
                <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                24hr Time
              </Toggle>
              <Toggle id="longName">
                <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
                    <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
                Long Route Names
              </Toggle>
              <h1>More</h1>
              <div className="credits">
                <a className="button" href="mailto:hello@dymajo.com">
                  <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h24v24H0z" fill="none"/>
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
                  </svg>
                  Send Feedback
                </a>
                <a className="button" rel="noopener" href="https://twitter.com/dymajoltd" target="_blank">
                  <svg style={{
                        margin: "-6px 3px -6px -6px"
                  }} xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 400 400"><path d="M153.62,301.59c94.34,0,145.94-78.16,145.94-145.94,0-2.22,0-4.43-.15-6.63A104.36,104.36,0,0,0,325,122.47a102.38,102.38,0,0,1-29.46,8.07,51.47,51.47,0,0,0,22.55-28.37,102.79,102.79,0,0,1-32.57,12.45,51.34,51.34,0,0,0-87.41,46.78A145.62,145.62,0,0,1,92.4,107.81a51.33,51.33,0,0,0,15.88,68.47A50.91,50.91,0,0,1,85,169.86c0,.21,0,.43,0,.65a51.31,51.31,0,0,0,41.15,50.28,51.21,51.21,0,0,1-23.16.88,51.35,51.35,0,0,0,47.92,35.62,102.92,102.92,0,0,1-63.7,22A104.41,104.41,0,0,1,75,278.55a145.21,145.21,0,0,0,78.62,23"/></svg>
                  Twitter
                </a>
                {button}
                <div className={className}>
                  <p>A number of people helped design, develop, and influence Transit.</p>
                  <ul>
                    <li><a target="_blank" rel="noopener" href="https://jono.nz">Jono Cooper</a> &ndash; Design, Code</li>
                    <li><a target="_blank" rel="noopener" href="http://mattdavidson.kiwi">Matt Davidson</a> &ndash; Code</li>
                    <li><a target="_blank" rel="noopener" href="https://twitter.com/itemic">Terran Kroft</a> &ndash; Testing, Feedback</li>
                    <li><a target="_blank" rel="noopener" href="https://github.com/blackdragon723">Dylan Wragge</a> &ndash; Testing, Feedback</li>
                    <li><a target="_blank" rel="noopener" href="http://www.generationzero.org/">Generation Zero</a> &ndash; Artwork</li>
                    <li><a target="_blank" rel="noopener" href="http://transportblog.co.nz">TransportBlog</a> &ndash; This app probably wouldn’t exist if we didn’t read TransportBlog every day.</li>
                  </ul>
                  <h3>Special Thanks</h3>
                  <p>These are great things that are free, and we love them.</p>
                  <ul>
                    <li><a target="_blank" rel="noopener" href="https://at.govt.nz">Auckland Transport</a> &ndash; API Usage</li>
                    <li><a target="_blank" rel="noopener" href="https://azure.microsoft.com">Microsoft Azure</a> &ndash; Application Server</li>
                    <li><a target="_blank" rel="noopener" href="https://github.com">GitHub</a> &ndash; Project Hosting</li>
                    <li><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/">OpenStreetMap</a> &ndash; Map Data</li>
                    <li><a target="_blank" rel="noopener" href="https://github.com/consindo/dymajo-transit">Other Tools &amp; Libraries</a></li>
                  </ul>
                  <div className="love">Made with 💙 in Auckland NZ</div>
                </div>
                <a className="button" href="https://www.patreon.com/dymajo" rel="noopener" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>Become a Patron</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
export default Settings