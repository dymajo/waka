import * as React from 'react'
import { Link } from 'react-router'
import { StationStore, StationMap } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

interface ISidebarButtonProps extends React.Props<SidebarButton> {
  url: string,
  name: string,
  icon: string
}

class SidebarButton extends React.Component<ISidebarButtonProps, {}> {
  constructor(props: ISidebarButtonProps) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
  }
  public triggerClick(e) {
    if (this.props.url === '/ss' || this.props.url === '/s') {
      e.preventDefault()
      UiStore.navigateSavedStations(this.props.url)
    }
  }
  public render() {
    var classname
    if (window.location.pathname.split('/')[1] == this.props.url.substring(1)) {
      classname = 'selected'
    }
    return (
      <li className={classname}>
        <Link to={this.props.url} onClick={this.triggerClick}><img src={`/icons/${this.props.icon}.svg`} /></Link>
        <span className="tooltip">{this.props.name}</span>
      </li>
    )
  }
}

interface IAppProps extends React.Props<Index> {}

class Index extends React.Component<IAppProps, {}> {
  public render() {
    return (
      <div className="panes">
        <nav className="bignav">
          <ul>
            <SidebarButton icon="home" name="Home" url="/" />
            <SidebarButton icon="search" name="Search" url="/s" />
            <SidebarButton icon="map" name="Saved Stations" url="/ss" />
            <SidebarButton icon="settings" name="Settings" url="/settings" />
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