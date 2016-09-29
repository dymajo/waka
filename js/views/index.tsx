import * as React from 'react'
import { browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'
import { StationStore, StationMap } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

interface ISidebarButtonProps extends React.Props<SidebarButton> {
  url: string,
  name: string
}

class SidebarButton extends React.Component<ISidebarButtonProps, {}> {
  constructor(props: ISidebarButtonProps) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
  }
  public triggerClick(e) {
    if (this.props.url === '/ss' || this.props.url === '/s') {
      UiStore.navigateSavedStations(this.props.url)
    } else {
      browserHistory.push(this.props.url)
    }
  }
  public render() {
    var classname
    if (window.location.pathname.split('/')[1] == this.props.url.substring(1)) {
      classname = 'selected'
    }
    if (window.location.pathname === '/pin' && this.props.url === '/') {
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

interface IAppProps extends React.Props<Index> {}

class Index extends React.Component<IAppProps, {}> {
  public render() {
    // I hate myself for doing this, but iOS scrolling is a fucking nightmare
    var className = 'panes'
    if (iOS.detect()) {
      className += ' ios'
    }
    // if it's running standalone, add a class because iOS doesn't support media queries
    if ((window as any).navigator.standalone) {
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
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 24 24">
                <path d="M20.2,21.1V10.8L12,2.7l-8.1,8.1v10.3h4.9v-8.2h6.6v8.2 M12,0.3l12,12l-1.1,1.3l-1-1.1v10.3h-8.2v-8.2h-3.2v8.2 H2.2V12.5l-1.1,1.1L0,12.3L12,0.3z" />
              </svg>
            </SidebarButton>
            <SidebarButton name="Search" url="/s">
              <svg version="1.1" x="0px" y="0px" viewBox="0 0 24 24">
                <path d="M8.3,14.9c0.9,0,1.8-0.1,2.6-0.5c0.9-0.4,1.5-0.9,2.2-1.4c0.6-0.6,1.1-1.4,1.5-2.2c0.3-0.8,0.5-1.7,0.5-2.7 c0-0.9-0.3-1.8-0.5-2.6c-0.4-0.8-0.9-1.5-1.5-2.2c-0.6-0.6-1.3-1-2.2-1.4c-0.8-0.4-1.7-0.5-2.6-0.5S6.5,1.7,5.6,2 c-0.8,0.4-1.5,0.8-2,1.4C2.9,4.1,2.4,4.9,2,5.6C1.8,6.4,1.5,7.3,1.5,8.2c0,1,0.3,1.9,0.5,2.7c0.4,0.8,0.9,1.5,1.5,2.2 c0.5,0.5,1.3,1,2,1.4C6.5,14.8,7.4,14.9,8.3,14.9 M24,23.1c0,0.3-0.1,0.4-0.3,0.6c-0.1,0.1-0.3,0.3-0.5,0.3c-0.1,0-0.4-0.1-0.5-0.3 l-9.2-9.2c-0.8,0.6-1.5,1-2.4,1.4c-0.9,0.4-1.8,0.5-2.8,0.5c-0.8,0-1.5-0.1-2.2-0.3c-0.8-0.3-1.4-0.5-2-0.9 c-0.5-0.4-1.1-0.8-1.7-1.3c-0.5-0.5-0.9-1-1.3-1.7s-0.6-1.3-0.8-1.9C0.1,9.7,0.1,8.9,0.1,8.2c0-0.6,0-1.4,0.3-2.2 c0.1-0.6,0.4-1.3,0.8-1.9c0.4-0.6,0.8-1.1,1.3-1.7c0.5-0.5,1.1-0.9,1.7-1.3c0.6-0.4,1.3-0.6,2-0.9C6.7,0.1,7.5,0,8.3,0 s1.5,0.1,2.2,0.3c0.8,0.3,1.4,0.5,1.9,0.9c0.6,0.4,1.3,0.8,1.8,1.3c0.4,0.5,0.9,1,1.3,1.7c0.3,0.6,0.6,1.3,0.8,1.9 c0.3,0.8,0.3,1.5,0.3,2.2c0,1-0.1,1.9-0.4,2.8c-0.4,0.9-0.9,1.8-1.5,2.6c0.1,0.1,0.4,0.3,0.8,0.6c0.3,0.3,0.6,0.6,1.1,1.1 c0.5,0.5,1,0.9,1.5,1.5c0.5,0.5,1.1,1,1.7,1.7c0.5,0.5,1.1,1,1.7,1.5c0.5,0.6,0.9,1,1.4,1.5c0.4,0.4,0.6,0.8,0.9,1 C23.9,22.9,24,23.1,24,23.1z"/>
              </svg>
            </SidebarButton>
            <SidebarButton name="Congestion Free" url="/cf">
              <img src="/icon.svg" />
            </SidebarButton>
            <SidebarButton name="Saved Stations" url="/ss">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 24 24">
                <path d="M2.9,22.4h18.2l-3.4-10.5h-5v5.6c0,0.1,0,0.1,0,0.3c-0.1,0-0.1,0-0.3,0.1c-0.1,0-0.1,0-0.3,0s-0.1,0-0.3,0h-0.1 c-0.1,0-0.1,0-0.3,0c-0.1-0.1-0.1-0.1-0.3-0.1c0-0.1,0-0.1,0-0.3v-5.6h-5 M9.8,3.8c0,0.3,0,0.6,0.1,0.9c0.1,0.3,0.3,0.5,0.5,0.6 c0.3,0.3,0.4,0.4,0.8,0.5c0.3,0.1,0.5,0.1,0.8,0.1c0.4,0,0.6,0,0.9-0.1c0.3-0.1,0.5-0.3,0.8-0.5c0.1-0.1,0.4-0.4,0.5-0.6 c0.1-0.3,0.1-0.6,0.1-0.9c0-0.4,0-0.6-0.1-0.9c-0.1-0.3-0.4-0.5-0.5-0.8c-0.3-0.1-0.5-0.3-0.8-0.4c-0.3-0.1-0.5-0.3-0.9-0.3 c-0.3,0-0.5,0.1-0.8,0.3c-0.4,0.1-0.5,0.3-0.8,0.4C10.2,2.4,10,2.6,9.9,2.9C9.8,3.1,9.8,3.4,9.8,3.8z M23.2,23.9H0.8l4.5-13.4h6V7.5 C10.8,7.3,10.4,7.2,10,7C9.6,6.7,9.4,6.5,9.1,6.1c-0.3-0.3-0.5-0.6-0.6-1C8.4,4.7,8.2,4.2,8.2,3.8c0-0.5,0.1-1,0.3-1.5 C8.7,1.9,9,1.5,9.4,1.1c0.3-0.4,0.6-0.6,1.1-0.8c0.5-0.3,0.9-0.3,1.4-0.3c0.5,0,1,0,1.5,0.3c0.4,0.1,0.8,0.4,1.1,0.8 c0.4,0.4,0.6,0.8,0.8,1.1c0.3,0.5,0.4,1,0.4,1.5c0,0.4-0.1,0.9-0.3,1.3c-0.1,0.4-0.4,0.8-0.6,1C14.6,6.5,14.4,6.7,14,7 c-0.4,0.3-0.8,0.4-1.3,0.5v3.1h6L23.2,23.9z"/>
              </svg>
            </SidebarButton>
            <SidebarButton name="Settings" url="/settings">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 24 24">
                <path d="M12,15.1c0.5,0,0.9-0.1,1.3-0.3c0.4-0.1,0.6-0.4,0.9-0.6c0.4-0.3,0.5-0.6,0.8-1c0.1-0.4,0.1-0.8,0.1-1.2 c0-0.5,0-0.9-0.1-1.3c-0.3-0.4-0.4-0.6-0.8-0.9C14,9.4,13.7,9.3,13.3,9c-0.4-0.1-0.8-0.1-1.3-0.1c-0.4,0-0.8,0-1.2,0.1 c-0.4,0.3-0.8,0.4-1,0.8c-0.3,0.3-0.5,0.5-0.6,0.9S8.9,11.5,8.9,12c0,0.4,0.1,0.8,0.3,1.2c0.1,0.4,0.4,0.8,0.6,1 c0.3,0.3,0.6,0.5,1,0.6C11.3,15,11.7,15.1,12,15.1 M12,7.5c0.6,0,1.2,0.1,1.8,0.4c0.5,0.3,0.9,0.5,1.4,0.9c0.4,0.5,0.6,0.9,0.9,1.4 c0.3,0.6,0.4,1.2,0.4,1.8c0,0.6-0.1,1.2-0.4,1.7c-0.3,0.5-0.5,1-0.9,1.4c-0.5,0.4-0.9,0.8-1.4,0.9c-0.6,0.3-1.2,0.4-1.8,0.4 c-0.6,0-1.2-0.1-1.7-0.4c-0.5-0.1-1-0.5-1.4-0.9c-0.4-0.4-0.8-0.9-0.9-1.4c-0.3-0.5-0.4-1-0.4-1.7c0-0.6,0.1-1.2,0.4-1.8 c0.1-0.5,0.5-0.9,0.9-1.4c0.4-0.4,0.9-0.6,1.4-0.9C10.9,7.6,11.4,7.5,12,7.5z M19.7,13c0-0.1,0-0.4,0-0.5c0.1-0.1,0.1-0.4,0.1-0.5 c0-0.3,0-0.4-0.1-0.6c0-0.1,0-0.4,0-0.5l2.8-1.7l-1-2.5l-3.2,0.6c-0.3-0.3-0.5-0.5-0.8-0.8c-0.3-0.3-0.5-0.5-0.8-0.8l0.6-3.2l-2.5-1 l-1.7,2.8c-0.3,0-0.4,0-0.5,0c-0.3-0.1-0.4-0.1-0.6-0.1c-0.1,0-0.4,0-0.5,0.1c-0.3,0-0.4,0-0.5,0L9.2,1.5l-2.5,1l0.8,3.2 C7.1,6.1,6.9,6.3,6.6,6.6C6.4,6.8,6.2,7.1,6,7.4L2.8,6.7l-1,2.5l2.7,1.7c0,0.3,0,0.4,0,0.5c0,0.3,0,0.4,0,0.6c0,0.1,0,0.4,0,0.5 c0,0.3,0,0.4,0,0.5l-2.7,1.8l1,2.5L6,16.5c0.1,0.4,0.4,0.6,0.6,0.9c0.3,0.3,0.5,0.4,0.9,0.6l-0.8,3.2l2.5,1l1.8-2.7 c0.1,0,0.3,0,0.5,0c0.1,0,0.4,0,0.5,0c0.3,0,0.4,0,0.6,0c0.1,0,0.3,0,0.5,0l1.7,2.7l2.5-1l-0.6-3.2c0.3-0.1,0.5-0.4,0.8-0.6 c0.3-0.3,0.5-0.5,0.8-0.9l3.2,0.8l1-2.5L19.7,13z M21.1,11.5c0,0.1,0,0.3,0,0.3c0,0.1,0,0.1,0,0.3v0.1c0,0.1,0,0.1,0,0.3l3,1.9 l-1.8,4.5l-3.5-0.8c-0.3,0.1-0.4,0.4-0.6,0.5l0.8,3.5L14.4,24l-1.8-3.1c-0.1,0-0.3,0-0.3,0c-0.1,0-0.1,0-0.3,0h-0.1 c-0.1,0-0.1,0-0.3,0L9.7,24l-4.5-1.9L6,18.6c-0.1-0.1-0.4-0.4-0.5-0.5L2,18.8L0,14.3l3.1-1.9c0-0.1,0-0.1,0-0.3V12 c0-0.1,0-0.1,0-0.3c0,0,0-0.1,0-0.3L0,9.7L2,5.2l3.5,0.8C5.6,5.7,5.9,5.5,6,5.3L5.2,1.8L9.7,0l1.9,3c0.1,0,0.1,0,0.3,0H12 c0.1,0,0.1,0,0.3,0c0,0,0.1,0,0.3,0l1.8-3l4.5,1.8l-0.8,3.5c0.3,0.3,0.4,0.4,0.6,0.6l3.5-0.8L24,9.7L21.1,11.5z"/>
              </svg>
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