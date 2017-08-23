import React from 'react'
import { withRouter } from 'react-router-dom'
import { StationStore, StationMap } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

class SidebarItemVanilla extends React.Component {
  constructor(props) {
    super(props)
    this.triggerTap = this.triggerTap.bind(this)
  }
  triggerTap = () => {
    if (this.props.type === 'install') {
      this.props.action()
    } else if (this.props.type !== 'url') {
      this.props.history.push(this.props.url)
    }
  }
  getColor(icon) {
    switch(icon) {
    case 'n':
      return '#0056a9'
    case 'e':
      return '#f39c12'
    case 'o':
      return '#21b4e3'
    case 's':
      return '#e52f2b'
    case 'w':
      return '#4f9734'
    default:
      return '#000'
    }
  }
  reject(e) {
    if (UiStore.state.mapView) {
      e.preventDefault()
    }
  }
  render() {
    
    var classname = (this.props.className || '') + ' ss'
    if (window.location.pathname == this.props.url) {
      classname += ' selected'
    }
    if (this.props.type === 'cf') {
      classname = classname.replace('ss', 'cf')
      var col = this.getColor
      var icon = this.props.name[0].toLowerCase()
      return (
        <li className={classname} onTouchTap={this.triggerTap}>
          <div className="gicon" style={{backgroundColor: col(icon)}}>{icon}</div>
          <div className="name">{this.props.name}</div>
        </li>
      )
    } else {
      let item = (
        <li className={classname} onTouchTap={this.triggerTap}>
          <div className="icon"><img src={`/icons/${this.props.icon}`} /></div>
          <div className="text-wrapper">
            <div className="name">{this.props.name}</div>
            <div className="description">{this.props.description}</div>
          </div>
        </li>
      )
      if (this.props.type === 'url') {
        return (
          <a href={this.props.url} target="_blank" rel="noopener" onClick={this.reject}>
            {item}
          </a>
        )
      } else if (this.props.type === 'description') {
        return (
          <li className={classname + ' text-only'}>
            <div className="text-wrapper">
              <div className="name">{this.props.name}</div>
              <div className="description">{this.props.description}</div>
            </div>
          </li>
        )
      }
      return item
    }
  }
}
const SidebarItem = withRouter(SidebarItemVanilla)

class SavedSations extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      stations: StationStore.getData(),
    }
    this.triggerUpdate = this.triggerUpdate.bind(this)
  }
  triggerUpdate() {
    this.setState({
      stations: StationStore.getData()
    })
  }
  componentDidMount() {
    StationStore.bind('change', this.triggerUpdate)
  }
  componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
  }
  reject(e) {
    if (UiStore.state.mapView) {
      e.preventDefault()
    }
  }
  render() {
    let stations = this.state.stations
    let message
    if (StationStore.getOrder().length === 0) {
      message = (
        <p>You haven’t saved any stations yet.<br />
        Save them and they’ll show up here!<br />
        </p>
      )
    }
    let onboarding = null
    if (true) {
      onboarding = <div className="onboard">
        <h2></h2>
        <ul>
          <SidebarItem
            type="description"
            name="Welcome to Transit!"
            description="Transit is your realtime guide to AT Buses, Trains, and Ferries."
          />
          <SidebarItem
            url="/l/nz-akl"
            icon="lines-light.svg"
            name="Lines"
            className="lines-btn"
            description="View all Bus, Train, and Ferry Services"
          />
          <SidebarItem
            type="install"
            action={this.props.togglePin}
            icon="pin.svg"
            name="Install App"
            description={<div><span>Add Transit to your home screen</span><span>Send Transit to your phone</span></div>}
          />
        </ul>
      </div>
    }
    return (
      <div className="savedstations">
        {onboarding}
        <h2>Saved Stations</h2>
        {message}
        <ul>
          {StationStore.getOrder().map((station) => {
            const url = station.split('|').slice(-1)
            return <SidebarItem
              key={station}
              url={`/s/${StationStore.StationData[station].region || 'nz-akl'}/${url}`}
              name={stations[station].name} 
              icon={stations[station].icon + '.svg'}
              description={stations[station].description} 
            />
          })}
        </ul>
        <h2>Service Alerts</h2>
        <ul>
          <SidebarItem
            type="url"
            url="https://twitter.com/AklTransport"
            icon="atlogo.png"
            name="Auckland Transport"
            description="@AklTransport on Twitter"
          />
          <SidebarItem
            type="url"
            url="https://twitter.com/DYMAJOLtd"
            icon="dymajo.png"
            name="DYMAJO"
            description="@DYMAJOLtd on Twitter"
          />
        </ul>
        <a className="label version" href="https://github.com/consindo/dymajo-transit" target="_blank" rel="noopener" onClick={this.reject}>
          DYMAJO Transit v{local.endpointStorage.getItem('AppVersion')}
        </a>
      </div>
    )
  }
}
export default SavedSations