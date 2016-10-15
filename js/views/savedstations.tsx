import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { iOS } from '../models/ios.ts'
import { StationStore, StationMap } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

interface ClickFunc {
  (): boolean
}

interface ISidebarItemProps extends React.Props<SidebarItem> {
  url: string,
  name: string,
  description?: string,
  icon?: string,
  click: ClickFunc,
  type?: string
}

class SidebarItem extends React.Component<ISidebarItemProps, {}> {
  constructor(props: ISidebarItemProps) {
    super(props)
    this.triggerTap = this.triggerTap.bind(this)
  }
  public triggerTap() {
    browserHistory.push(this.props.url)
    if (iOS.detect() && !(window as any).navigator.standalone) {
      this.props.click()
    }
  }
  public getColor(icon) {
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
  public render() {
    
    var classname = 'ss'
    if (window.location.pathname == this.props.url) {
      classname += ' selected'
    }
    if (this.props.type === 'cf') {
      classname += ' cf'
      var col = this.getColor
      var icon = this.props.name[0].toLowerCase()
      return (
        <li className={classname} onTouchTap={this.triggerTap}>
          <div className="gicon" style={{backgroundColor: col(icon)}}>{icon}</div>
          <div className="name">{this.props.name}</div>
        </li>
      )
    } else {
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
}

interface IAppProps extends React.Props<SavedSations> {}
interface IAppState {
  stations: StationMap,
  back: boolean,
  animate: boolean
}

class SavedSations extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      stations: StationStore.getData(),
      back: false,
      animate: false
    }
    this.triggerUpdate = this.triggerUpdate.bind(this)
    this.triggerBack = this.triggerBack.bind(this)
    this.triggerNewState = this.triggerNewState.bind(this)

    StationStore.bind('change', this.triggerUpdate)
    UiStore.bind('goingBack', this.triggerBack)
  }
  private triggerUpdate() {
    this.setState({
      back: this.state.back,
      animate: this.state.animate,
      stations: StationStore.getData()
    })
  }
  // set it and whatever
  public componentWillReceiveProps() {
    if (!iOS.detect() || (window as any).navigator.standalone) {
      this.setState({
        back: this.state.back,
        animate: true,
        stations: this.state.stations
      })
    }
  }
  public triggerNewState() {
    this.setState({
      back: this.state.back,
      animate: true,
      stations: this.state.stations
    })

    setTimeout(() => {
      this.setState({
        back: this.state.back,
        animate: false,
        stations: this.state.stations
      })
    }, 550)
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
      back: UiStore.getState().goingBack,
      animate: this.state.animate
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
    if (this.state.animate) {
      classname += ' animate'
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
          <ul className={scrolling} onTouchStart={iOS.triggerStart}>
            <div className="scrollwrap">
            <h2>Saved Stations</h2>
            {message}
            {StationStore.getOrder().map((station) => {
              return <SidebarItem
                key={station}
                url={`/ss/${station}`}
                name={stations[station].name} 
                icon={stations[station].icon}
                click={this.triggerNewState}
                description={stations[station].description} 
              />
            })}
              <div className="cfwrapper">
                <h2>Congestion Free Network</h2>
                <SidebarItem type="cf" name="Northern Busway" />
                <SidebarItem type="cf" name="Ferries" />
                <SidebarItem type="cf" name="Eastern Line" />
                <SidebarItem type="cf" name="Onehunga Line" />
                <SidebarItem type="cf" name="Southern Line" />
                <SidebarItem type="cf" name="Western Line" />
                <a href="http://www.congestionfree.co.nz/" target="_blank">What is the Congestion Free Network?</a>
              </div>
            </div>
          </ul>
        </nav>
        {this.props.children}
      </div>
    )
  }
}
export default SavedSations