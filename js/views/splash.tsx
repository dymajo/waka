import * as React from 'react'
import { Link, browserHistory } from 'react-router'
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
    return (
      <div className="splashScreen">
        {modal}
        <div className="topwrapper">
          <h1>
            <img src="icons/icon.png" />
            <span className="company">DYMAJO</span>
            <span>Transit</span>
          </h1>
          
        </div>
        <div className="wrapper">
          <h2>Auckland</h2>
          <p>I’ve stolen this piece of artwork from Generation Zero. I should probably ask them for permission.</p>
          <div className="buttonbox">
            <button onTouchTap={this.triggerSearch} className="primary">
              <img src="icons/search.png"/>Find a Station
            </button>
            {//<button className="send">Send to Phone</button>
            }
            <button onTouchTap={this.triggerPin} className="pin"><img src="icons/home.png"/>Pin to Home</button>
          </div>
          <footer>
            <p>&copy; {new Date().getUTCFullYear()} DYMAJO Ltd &middot; v0.1<small>β</small></p>
          </footer>
        </div>
      </div>
    )
  }
}
export default Splash