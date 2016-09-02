import * as React from 'react'
import { Link } from 'react-router'
import { StationStore, StationMap } from '../stores/stationStore.ts'

interface ISidebarItemProps extends React.Props<SidebarItem> {
  url: string,
  name: string,
  description: string,
  icon: string
}

class SidebarItem extends React.Component<ISidebarItemProps, {}> {
  constructor(props: ISidebarItemProps) {
    super(props)
  }
  public render() {
    var classname
    if (window.location.pathname == this.props.url) {
      classname = 'selected'
    }
    return (
      <li className={classname}>
        <Link to={this.props.url}>
          <div className="icon">{this.props.icon}</div>
          <div className="text-wrapper">
            <div className="name">{this.props.name}</div>
            <div className="description">{this.props.description}</div>
           </div>
        </Link>
      </li>
    )
  }
}

interface ISidebarButtonProps extends React.Props<SidebarButton> {
  url: string,
  name: string,
  icon: string
}

class SidebarButton extends React.Component<ISidebarButtonProps, {}> {
  public render() {
    var classname
    if (window.location.pathname == this.props.url) {
      classname = 'selected'
    }
    return (
      <li className={classname}>
        <Link to={this.props.url}>{this.props.icon}</Link>
      </li>
    )
  }
}

interface IAppProps extends React.Props<Index> {}
interface IAppState {
  stations: StationMap
}

class Index extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      stations: StationStore.getData()
    }

    StationStore.bind('change', () => {
      this.setState({
        stations: StationStore.getData()
      })
    })
  }
  public render() {
    var stations = this.state.stations
    return (
      <div className="panes">
        <nav className="bignav">
          <ul>
            <SidebarButton icon="" name="Home" url="/" />
            <SidebarButton icon="" name="Search" url="/s" />
            <SidebarButton icon="" name="Saved Stations" url="/ss" />
            <SidebarButton icon="" name="Send Feedback" url="/feedback" />
            <SidebarButton icon="" name="Settings" url="/settings" />
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