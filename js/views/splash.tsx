import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'
import Pin from './pin.tsx'

interface IAppProps extends React.Props<Splash> {}

class Splash extends React.Component<IAppProps, {}> {
  public triggerSearch() {
    browserHistory.push(`/s`)
  }
  public triggerPin() {
    browserHistory.push(`/pin`)
  }
  public render() {
    var modal
    if (window.location.pathname === '/pin') {
      modal = <Pin />
    }
    var output = <div className="mobile">
      <h2>Auckland</h2>
      <p>Your realtime guide to AT buses, trains, and ferries.</p>
      <div className="buttonbox">
        <button onTouchTap={this.triggerSearch} className="primary">
          <img src="icons/search.png"/>Find a Station
        </button>
        <button onTouchTap={this.triggerPin} className="pin"><img src="icons/home.png"/>Pin to Home</button>
      </div>
    </div>

    var userAgent = window.navigator.userAgent.toLowerCase()
    if (iOS.detect()) {
      if (/fbios/.test(userAgent) || /twitter/.test(userAgent)) {
        output = <div className="uiwebview">
          <h2>Whoa!</h2>
          <p>You’ll need to open Transit in Safari first.</p><br />
        </div>
      }
    }
    return (
      <div className="splashScreen">
        {modal}
        <div className="topwrapper">
          <h1>
            <img src="icons/icon.png" />
            <span className="company">DYMAJO</span>
            <span>Transit</span>
          </h1>
          <button className="send" onTouchTap={this.triggerPin}>Send to Phone</button>
          <h2>Your way around Auckland<br />
          <button onTouchTap={this.triggerSearch} className="primary">
              <img src="icons/search.png"/>Find a Station
          </button>
          </h2>
        </div>
        <div className="wrapper">
          {output}
          <div className="desktop">
            <h2>Works anywhere</h2>
            <p>Transit works great on both iOS and Android devices! Just head to <Link to="/pin">transit.dymajo.com</Link> on your phone, and pin it to your home screen.</p>
            <button className="send" onTouchTap={this.triggerPin}>Send to Phone</button>
          </div>
          <footer>
            <p>&copy; {new Date().getUTCFullYear()} DYMAJO Ltd &middot; <small>V</small>{localStorage.getItem('AppVersion')}</p>
          </footer>
        </div>
      </div>
    )
  }
}
export default Splash