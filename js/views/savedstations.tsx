import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'
import { StationStore, StationMap } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

interface ISidebarItemProps extends React.Props<SidebarItem> {
  url: string,
  name: string,
  description: string,
  icon: string
}

class SidebarItem extends React.Component<ISidebarItemProps, {}> {
  constructor(props: ISidebarItemProps) {
    super(props)
    this.triggerTap = this.triggerTap.bind(this)
  }
  public triggerTap() {
    browserHistory.push(this.props.url)
  }
  public render() {
    var classname = 'ss'
    if (window.location.pathname == this.props.url) {
      classname += ' selected'
    }
    return (
      <li className={classname} onTouchTap={this.triggerTap}>
        <div className="icon"><img src={`/icons/${this.props.icon}.svg`} /></div>
        <div className="text-wrapper">
          <div className="name">{this.props.name}</div>
          <div className="description">{this.props.description}</div>
        </div>
      </li>
    )
  }
}

interface IAppProps extends React.Props<SavedSations> {}
interface IAppState {
  stations: StationMap,
  back: boolean
}

class SavedSations extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      stations: StationStore.getData(),
      back: false
    }
    this.triggerUpdate = this.triggerUpdate.bind(this)
    this.triggerBack = this.triggerBack.bind(this)

    StationStore.bind('change', this.triggerUpdate)
    UiStore.bind('goingBack', this.triggerBack)
  }
  private triggerUpdate() {
    this.setState({
      back: this.state.back,
      stations: StationStore.getData()
    })
  }
  private componentWillUnmount() {
    StationStore.unbind('change', this.triggerUpdate)
    UiStore.unbind('goingBack', this.triggerBack)
  }
  public triggerSearch() {
    browserHistory.push(`/s`)
  }
  public triggerBack() {
    this.setState({
      stations: this.state.stations,
      back: UiStore.getState().goingBack
    })
  }
  public triggerStart(event) {
    var e = event.currentTarget
    var top = e.scrollTop, totalScroll = e.scrollHeight, currentScroll = top + e.offsetHeight;

    if ( top === 0 ) {
        e.scrollTop = 1;
    } else if ( currentScroll === totalScroll ) {
        e.scrollTop = top - 1;
    }
  }
  public render() {
    var stations = this.state.stations
    var classname = 'savedstations'
    if (window.location.pathname === '/ss') {
      classname += ' activepane'
    }
    if (this.state.back) {
      classname += ' goingback'
    }
    var scrolling = ''
    var message
    if (StationStore.getOrder().length === 0) {
      message = <p>
      You haven’t saved any stations yet.<br />
      Save them and they’ll show up here!<br />
      <button onClick={this.triggerSearch} className="primary">
        <img src="icons/search.png"/>Find a Station
      </button>
    </p>
    } else {
      scrolling = 'enable-scrolling'
    }
    return (
      <div className={classname}>
        <nav>
          <h2>Saved Stations</h2>
          <ul className={scrolling} onTouchStart={iOS.triggerStart}>
            <div className="scrollwrap">
            {message}
            {StationStore.getOrder().map(function(station) {
              return <SidebarItem
                key={station}
                url={`/ss/${station}`}
                name={stations[station].name} 
                icon={stations[station].icon} 
                description={stations[station].description} 
              />
            })}
            </div>
          </ul>
        </nav>
        {this.props.children}
      </div>
    )
  }
}
export default SavedSations