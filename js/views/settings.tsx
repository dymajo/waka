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
      button = <button onTouchTap={this.triggerCredits}>View Credits</button>
    }
    return(
      <div className="settingsContainer">
        <h2 className="settingsHeader">Settings</h2>
        <div className="settings enable-scrolling" onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            <div className="container">
              <Toggle id="clock">
                Show Clock
              </Toggle>
            </div>
            <div className="credits">
              <div className="logo" id="logo">
                <span className="company">Dymajo </span>
                <span className="app">Transit </span>
                <span className="version">0.1<small>β</small></span>
              </div>
              <div className="copyright"><a className="subtle" href="https://dymajo.com" target="_blank">&copy; 2016 DYMAJO LTD</a></div>
              <div className="sourcecode">This app is licensed under the <a className="subtle" href="https://github.com/consindo/dymajo-transit/blob/master/LICENSE" target="_blank">MIT License</a>.<br />
              Contributions are welcome! <a href="https://github.com/consindo/dymajo-transit" target="_blank">github.com/consindo/dymajo-transit</a></div>
              {button}
              <div className={className}>
                <h3>Credits</h3>
                <p>A number of people helped design, develop, and influence Transit.</p>
                <ul>
                  <li><a target="_blank" href="https://jono.nz">Jono Cooper</a> &ndash; Design, Code</li>
                  <li><a target="_blank" href="http://mattdavidson.kiwi">Matt Davidson</a> &ndash; Code</li>
                  <li><a target="_blank" href="https://twitter.com/itemic">Terran Kroft</a> &ndash; Testing, Feedback</li>
                  <li><a target="_blank" href="https://github.com/blackdragon723">Dylan Wragge</a> &ndash; Testing, Feedback</li>
                  <li><a target="_blank" href="http://www.generationzero.org/">Generation Zero</a> &ndash; Artwork (We haven’t actually asked)</li>
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
            </div>
          </div>
        </div>
      </div>
    )
  }
}
export default Settings