import * as React from 'react'
import { Link } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'

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

interface IAppProps extends React.Props<Index> {}

class Index extends React.Component<IAppProps, {}> {
  public render() {
    var stations = StationStore.getData()
    return (
      <div className="panes">
        <nav className="navigation">
          <ul>
            <SidebarItem url="/s" name="Search for a Station" />
            <h2>Stations</h2>
            {StationStore.getOrder().map(function(station) {
              return <SidebarItem
                key={station}
                url={`/s/${station}`}
                name={stations[station].name} 
                icon={stations[station].icon} 
                description={stations[station].description} 
              />
            })}
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