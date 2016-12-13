import React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'
import { StationStore, StationMap } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

class Index extends React.Component {
  render() {
    // I hate myself for doing this, but iOS scrolling is a fucking nightmare
    var className = 'panes'
    if (iOS.detect()) {
      className += ' ios'
    }
    // if it's running standalone, add a class because iOS doesn't support media queries
    if (window.navigator.standalone) {
      className += ' ios-standalone'
    }
    return (
      <div className={className}>
        <header className="material-header">
          <div>
            <h1 className="full-height">
              <img className="logo" src='/icons/icon.png' width='16' />
              <strong>DYMAJO</strong> <span>Transit</span></h1>
          </div>
        </header>
        <div className="root-map">
          Root Map.
        </div>
        <div className="root-card">
          Root Card.
        </div>
        <div className="content">
        {this.props.children}
        </div>
      </div>
    )
  }
}
export default Index