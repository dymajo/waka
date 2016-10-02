import * as React from 'react'
import { iOS } from '../models/ios.ts'
import Toggle from './toggle.tsx'

interface ISettingsProps extends React.Props<Settings> {}
interface ISettingsState {
  credits: boolean
}

class Settings extends React.Component<ISettingsProps, ISettingsState> {
  constructor(props) {
    super(props)
    this.state = {
      credits: false
    }

    this.triggerCredits = this.triggerCredits.bind(this)
  }

  public triggerCredits() {
    this.setState({
      credits: true
    })
  }

  public render() {
    var button
    var className = 'creditscontainer'
    if (this.state.credits) {
      className += ' visible'
    } else {
      button = <button onTouchTap={this.triggerCredits}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/></svg>View Credits</button>
    }
    return(
      <div className="settingsContainer">
        <div className="settings enable-scrolling" onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            <div className="logobox">
              <div className="logo" id="logo">
                <span className="company">Dymajo </span>
                <span className="app">Transit </span>
                <span className="version">0.2<small>β</small></span>
              </div>
              <div className="copyright"><a className="subtle" href="https://dymajo.com" target="_blank">&copy; 2016 DYMAJO LTD</a></div>
              <div className="sourcecode">This app is licensed under the <a className="subtle" href="https://github.com/consindo/dymajo-transit/blob/master/LICENSE" target="_blank">MIT License</a>.<br />
              Contributions are welcome!<br /><a href="https://github.com/consindo/dymajo-transit" target="_blank">github.com/consindo/dymajo-transit</a></div>
            </div>
            <div className="container">
              <h1>Settings</h1>
              <Toggle id="clock">
                24hr Time
              </Toggle>
              <Toggle id="longName">
                Long Route Names
              </Toggle>
              <h1>More</h1>
              <div className="credits">
                {button}
                <div className={className}>
                  <p>A number of people helped design, develop, and influence Transit.</p>
                  <ul>
                    <li><a target="_blank" href="https://jono.nz">Jono Cooper</a> &ndash; Design, Code</li>
                    <li><a target="_blank" href="http://mattdavidson.kiwi">Matt Davidson</a> &ndash; Code</li>
                    <li><a target="_blank" href="https://twitter.com/itemic">Terran Kroft</a> &ndash; Testing, Feedback</li>
                    <li><a target="_blank" href="https://github.com/blackdragon723">Dylan Wragge</a> &ndash; Testing, Feedback</li>
                    <li><a target="_blank" href="http://www.generationzero.org/">Generation Zero</a> &ndash; Artwork</li>
                    <li><a target="_blank" href="http://transportblog.co.nz">TransportBlog</a> &ndash; This app probably wouldn’t exist if we didn’t read TransportBlog every day.</li>
                  </ul>
                  <h3>Special Thanks</h3>
                  <p>These are great things that are free, and we love them.</p>
                  <ul>
                    <li><a target="_blank" href="https://at.govt.nz">Auckland Transport</a> &ndash; API Usage</li>
                    <li><a target="_blank" href="https://azure.microsoft.com">Microsoft Azure</a> &ndash; Application Server</li>
                    <li><a target="_blank" href="https://github.com">GitHub</a> &ndash; Project Hosting</li>
                    <li><a target="_blank" href="https://www.mapbox.com/">Mapbox</a> &ndash; Map Provider</li>
                    <li><a target="_blank" href="https://github.com/consindo/dymajo-transit">Other Tools &amp; Libraries</a></li>
                  </ul>
                  <div className="love">Made with 💙 in Auckland NZ</div>
                </div>
                <a className="button" href="https://www.patreon.com/dymajo" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>Become a Patron</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
export default Settings