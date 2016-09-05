import * as React from 'react'
import { Link, browserHistory } from 'react-router'
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
          <div className="icon"><img src={`/icons/${this.props.icon}.svg`} /></div>
          <div className="text-wrapper">
            <div className="name">{this.props.name}</div>
            <div className="description">{this.props.description}</div>
           </div>
        </Link>
      </li>
    )
  }
}

interface IAppProps extends React.Props<SavedSations> {}
interface IAppState {
  stations: StationMap
}

class SavedSations extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      stations: StationStore.getData()
    }
    this.triggerUpdate = this.triggerUpdate.bind(this)

    StationStore.bind('change', this.triggerUpdate)
  }
  private triggerUpdate() {
    this.setState({
      stations: StationStore.getData()
    })
  }
  private componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
  }
  public render() {
    var stations = this.state.stations
    var classname = 'savedstations'
    if (window.location.pathname === '/ss') {
      classname += ' activepane'
    }
    return (
      <div className={classname}>
        <nav>
          <h2>Saved Stations</h2>
          <ul>
          {StationStore.getOrder().map(function(station) {
            return <SidebarItem
              key={station}
              url={`/ss/${station}`}
              name={stations[station].name} 
              icon={stations[station].icon} 
              description={stations[station].description} 
            />
          })}
          </ul>
        </nav>
        {this.props.children}
      </div>
    )
  }
}
export default SavedSations