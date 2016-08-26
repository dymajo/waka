import * as React from 'react'
import { Link } from 'react-router'

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
    return (
      <div className="panes">
        <nav className="navigation">
          <ul>
            <SidebarItem url="/s" name="Search for a Station" />
            <h2>Stations</h2>
            <SidebarItem url="/s/8439" icon="🚍" name="Youth Street" description="Stop 8439 / 1153 Dominion Road" />
            <SidebarItem url="/s/0133" icon="🚆" name="Britomart" description="Britomart Train Station, Auckland Central" />
            <SidebarItem url="/s/7058" icon="🚍" name="Civic" description="Stop 7058 / Queen Street outside St James" />
            <SidebarItem url="/s/7056" icon="🚍" name="Civic Express" description="Stop 7056 / Queen Street outside St James" />
            <SidebarItem url="/s/9630" icon="🛳" name="Downtown Ferry Terminal" description="To Devonport" />
            <SidebarItem url="/s/7148" icon="🚍" name="Upper Symonds" description="Stop 7148 / 36 Symonds Street" />
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