import React from 'react'
import { Link, browserHistory } from 'react-router'
import { iOS } from '../models/ios.js'
import { StationStore, StationMap } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

class SidebarItem extends React.Component {
  constructor(props) {
    super(props)
    this.triggerTap = this.triggerTap.bind(this)
  }
  triggerTap() {
    if (this.props.type !== 'url') {
      browserHistory.push(this.props.url)
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
  render() {
    
    var classname = 'ss'
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
          <a href={this.props.url} target="_blank" rel="noopener">
            {item}
          </a>
        )
      }
      return item
    }
  }
}

class SavedSations extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      stations: StationStore.getData()
    }
  }
  triggerUpdate() {
    this.setState({
      stations: StationStore.getData()
    })
  }
  componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
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
    return (
      <div className="savedstations">
        <h2>Saved Stations</h2>
        {message}
        <ul>
          {StationStore.getOrder().map((station) => {
            return <SidebarItem
              key={station}
              url={`/s/${station}`}
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
        <a className="label version" href="https://github.com/consindo/dymajo-transit" target="_blank" rel="noopener">
          DYMAJO Transit v{localStorage.getItem('AppVersion')}
        </a>
      </div>
    )
  }
}
export default SavedSations