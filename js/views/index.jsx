import React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'
import { StationStore, StationMap } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

class SidebarButton extends React.Component {
  constructor(props) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
  }
  triggerClick(e) {
    if (this.props.url === '/ss' || this.props.url === '/s') {
      UiStore.navigateSavedStations(this.props.url)
    } else {
      browserHistory.push(this.props.url)
    }
  }
  render() {
    var classname
    if (window.location.pathname.split('/')[1] == this.props.url.substring(1)) {
      classname = 'selected'
    }
    if (window.location.pathname === '/pin' && this.props.url === '/') {
      classname = 'selected'
    }
    if (this.props.url === '/s' && (window.location.pathname.split('/')[1] === 'cf' || window.location.pathname.split('/')[1] === 'l')) {
      classname = 'selected'
    }
    return (
      <li className={classname}>
        <button onTouchTap={this.triggerClick}>{this.props.children}</button>
        <span className="tooltip">{this.props.name}</span>
      </li>
    )
  }
}


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
    // i embedded the svgs so they load at launch
    // also so we can css them
    // also because iOS force touch on the buttons is weird af
    return (
      <div className={className}>
        <nav className="bignav">
          <ul>
            <SidebarButton name="Home" url="/">
              <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </SidebarButton>
            <SidebarButton name="Search" url="/s">
              <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </SidebarButton>
            <SidebarButton name="Saved Stations" url="/ss">
              <svg viewBox="0 0 24 24"><path d="M18 8c0-3.31-2.69-6-6-6S6 4.69 6 8c0 4.5 6 11 6 11s6-6.5 6-11zm-8 0c0-1.1.9-2 2-2s2 .9 2 2-.89 2-2 2c-1.1 0-2-.9-2-2zM5 20v2h14v-2H5z"/></svg>
            </SidebarButton>
            <SidebarButton name="Settings" url="/settings">
              <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </SidebarButton>
          </ul>
        </nav>
        <div className="content">
        {this.props.children}
        </div>
      </div>
    )
  }
}
export default Index