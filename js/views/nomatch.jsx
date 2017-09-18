import React from 'react'
import { Link } from 'react-router-dom'

import BackIcon from '../../dist/icons/back.svg'

class NoMatch extends React.Component {  
  render() {
    return (
      <div className="default-container http-not-found">
        <header className="material-header">
          <Link to="/" className="header-left" onTouchTap={this.triggerBack}>
            <BackIcon />
          </Link>
          <div className="header-expand">
            <h1>Not Found</h1>
          </div>
        </header>
        <div className="default-content">
          <p>Sorry, but the page you were trying to view does not exist.</p>
          <Link to="/">Find a Station</Link>
        </div>
      </div>
    )
  }
}
export default NoMatch