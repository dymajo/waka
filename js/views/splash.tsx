import * as React from 'react'
import { Link, browserHistory } from 'react-router'

interface IAppProps extends React.Props<Splash> {}

class Splash extends React.Component<IAppProps, {}> {
  public render() {

    return (
      <div className="splashScreen">
        <div className="topwrapper">
          <h1>
            <span className="company">DYMAJO</span>
            <span>Transit</span>
            <sup className="version">β</sup>
          </h1>
          
        </div>
        <div className="wrapper">
          <h2>Auckland</h2>
          <p>I've stolen this piece of artwork from Generation Zero. I should probably ask them for permission.</p>
          <div className="buttonbox">
            <button className="primary">Find a Station</button>
            <button>Send to Phone</button>
          </div>
          <footer>
            <p>&copy; 2016 DYMAJO Ltd &middot; v0.1<small>β</small></p>
          </footer>
        </div>
      </div>
    )
  }
}
export default Splash