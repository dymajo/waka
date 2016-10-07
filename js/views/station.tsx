import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { iOS } from '../models/ios.ts'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'
import { SettingsStore } from '../stores/settingsStore.ts'
import TripItem from './tripitem.tsx'

declare function require(name: string): any;
let request = require('reqwest')
let webp = require('../models/webp')
let swipeview = require('../swipeviewjs/swipe.js')

interface RealTimeItem {
  delay: number,
  stop_sequence: number,
  timestamp: number,
  v_id: string,
  double_decker: boolean
}
interface RealTimeMap {
  [name: string]: RealTimeItem;
}

interface ServerTripItem {
  arrival_time_seconds: string,
  stop_sequence: string,
  trip_id: string,
  route_long_name: string,
  agency_id: string,
  direction_id: string,
  end_date: string,
  frequency: string,
  station: string,
  route_short_name: string,
  route_type: string,
  start_date: string,
  trip_headsign: string
}

interface IAppProps extends React.Props<Station> {
  routeParams: {
    station: string
  }
}
interface IAppState {
  name?: string,
  description?: string,
  stop?: string,
  trips?: Array<ServerTripItem>,
  realtime?: RealTimeMap,
  loading?: boolean,
  saveModal?: boolean,
  webp?: boolean,
  stickyScroll?: boolean,
  stop_lat?: number,
  stop_lon?: number
}

// hack
let liveRefresh = undefined
let allRequests = [undefined, undefined, undefined]
let tripsSort = function(a,b) {
  var rv = Math.floor(a.arrival_time_seconds/60) - Math.floor(b.arrival_time_seconds/60)
  if (rv === 0) {
      rv = a.route_short_name.localeCompare(b.route_short_name)
  }
  return rv
}

class Station extends React.Component<IAppProps, IAppState> {
  public state : IAppState

  refs: {
    [key: string]: (Element);
    scroll: (HTMLDivElement);
    swipecontent: (HTMLDivElement);
    swipeheader: (HTMLDivElement);
  }

  constructor(props: IAppProps) {
    super(props)
    this.state = {
      name: '',
      description: '',
      stop: '',
      trips: [],
      realtime: {},
      loading: true,
      saveModal: false,
      webp: webp.support,
      stickyScroll: false,
      stop_lat: undefined,
      stop_lon: undefined
    }
    this.setStatePartial = this.setStatePartial.bind(this)
    this.triggerBack = this.triggerBack.bind(this)
    this.triggerSave = this.triggerSave.bind(this)
    this.triggerSaveAdd = this.triggerSaveAdd.bind(this)
    this.triggerSaveCancel = this.triggerSaveCancel.bind(this)
    this.triggerSaveChange = this.triggerSaveChange.bind(this)
    this.triggerUpdate = this.triggerUpdate.bind(this)
    this.triggerScroll = this.triggerScroll.bind(this)
    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchMove = this.triggerTouchMove.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)

    StationStore.bind('change', this.triggerUpdate)
  }
  /* THIS CAN ACTUALLY BE REPLACED WITH:
  this.setState({
    editorState: editorState
  } as MainState);
  interface MainState {
    todos?: Todo[];
    hungry?: Boolean;
    editorState?: EditorState;
  }
  */
  private setStatePartial(newState) {
    this.setState({
      name: (typeof(newState.name) !== 'undefined' ? newState.name : this.state.name),
      description:(typeof(newState.description) !== 'undefined' ? newState.description : this.state.description),
      stop: (typeof(newState.stop) !== 'undefined' ? newState.stop : this.state.stop),
      trips: (typeof(newState.trips) !== 'undefined' ? newState.trips : this.state.trips),
      realtime: (typeof(newState.realtime) !== 'undefined' ? newState.realtime : this.state.realtime),
      loading: (typeof(newState.loading) !== 'undefined' ? newState.loading : this.state.loading),
      saveModal: (typeof(newState.saveModal) !== 'undefined' ? newState.saveModal : this.state.saveModal),
      webp: this.state.webp
    })
  }
  private triggerUpdate() {
    var cachedName = StationStore.getData()[this.props.routeParams.station]
    if (typeof(cachedName) !== 'undefined') {
      this.setStatePartial({
        name: cachedName.name
      })
    } else {
      // too lazy to replicate the above but different :/
      this.forceUpdate()
    }
  }
  private getData(newProps, refreshMode = false) {
    // don't do this
    if (!refreshMode) {
      var cachedName = StationStore.getData()[newProps.routeParams.station]
      if (typeof(cachedName) !== 'undefined') {
        requestAnimationFrame(() => {
          this.setState({
            name: cachedName.name,
            description: cachedName.description,
            stop: newProps.routeParams.station,
            stop_lat: cachedName.stop_lat, 
            stop_lon: cachedName.stop_lon
          } as IAppState)
        })

      // If it's not cached, we'll just ask the server
      } else {
        allRequests[0] = request(`/a/station/${newProps.routeParams.station}`).then((data) => {
          requestAnimationFrame(() => {
            var name = data.stop_name.replace(' Train Station', '')
            name = name.replace(' Ferry Terminal', '')

            this.setState({
              name: name,
              description: `${data.stop_name}`,
              stop: this.props.routeParams.station,
              stop_lat: data.stop_lat, 
              stop_lon: data.stop_lon
            } as IAppState)
          })
        })
      }
    }

    allRequests[1] = request(`/a/station/${newProps.routeParams.station}/times`).then((data) => {
      this.tripsCb(data.trips)
    })
  }
  private getMultiData(newProps, refreshMode = false) {
    var stations = newProps.routeParams.station.split('+')
    // too many stations
    if (stations.length > 7) {
      return this.setState({
        loading: false
      } as IAppState)
    }


    var name = StationStore.getMulti(newProps.routeParams.station)
    this.setStatePartial({
      name: name,
      description: `Busway Stops ${stations.join(', ')}`,
      stop: stations[0]
    })

    var tripData = []
    var promises = []
    stations.forEach(function(station) {
      promises.push(new Promise(function(resolve, reject) {
        request(`/a/station/${station}/times`).then((data) => {
          data.trips.forEach(function(trip) {
            trip.station = station
            tripData.push(trip)
          })
          resolve()
        })
      }))
    })

    Promise.all(promises).then(() => {
      this.tripsCb(tripData)
    })

  }
  private tripsCb(tripData) {
    if (typeof(tripData.length) === 'undefined' || tripData.length === 0) {
      return this.setStatePartial({
        loading: false
      })
    }
    tripData.sort(tripsSort)

    this.setState({
      trips: tripData,
      loading: false
    } as IAppState)

    // only realtime request for buses
    if (tripData[0].route_type !== 3) {
      return
    }

    var queryString = []
    tripData.forEach(function(trip) {
      var arrival = new Date()
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.arrival_time_seconds))

      // only gets realtime info for things +30mins away
      if (arrival.getTime() < (new Date().getTime() + 1800000)) {
        queryString.push(trip.trip_id)
      }
    })

    // now we do a request to the realtime API
    allRequests[2] = request({
      method: 'post',
      type: 'json',
      contentType: 'application/json',
      url: `/a/realtime`,
      data: JSON.stringify({trips: queryString})
    }).then((rtData) => {
      this.setStatePartial({
        // because typescript is dumb, you have to repass
        realtime: rtData
      })        
    })
  }
  public triggerBack() {
    var path = window.location.pathname.split('/')
    var i = path.indexOf(this.props.routeParams.station)
    UiStore.navigateSavedStations(path.slice(0,i).join('/'))
  }
  public triggerSave() {
    this.setStatePartial({
      saveModal: true
    })
  }
  public triggerSaveAdd() {
    this.setStatePartial({
      saveModal: false
    })
    StationStore.addStop(this.props.routeParams.station, this.state.name)
  }
  public triggerSaveCancel() {
    StationStore.removeStop(this.props.routeParams.station)
    this.setStatePartial({
      saveModal: false
    })
  }
  public triggerSaveChange(e) {
    this.setStatePartial({
      name: e.currentTarget.value
    })
  }
  public triggerScroll(e) {
    if (e.target.scrollTop > 181) {
      if (this.state.stickyScroll === false) {
        this.setState({
          stickyScroll: true
        })
      }
    } else {
      if (this.state.stickyScroll === true) {
        this.setState({
          stickyScroll: false
        })
      }
    }
  }
  public triggerTouchStart(e) {
    if (!this.state.stickyScroll) {
      swipeview.contentTouchStart(e.nativeEvent)
    }
  }
  public triggerTouchMove(e) {
    if (!this.state.stickyScroll) {
      swipeview.contentTouchMove(e.nativeEvent)
    }
  }
  public triggerTouchEnd(e) {
    if (!this.state.stickyScroll) {
      swipeview.contentTouchEnd(e.nativeEvent)
    }
  }
  public componentDidMount() {
    swipeview.contentEl = ReactDOM.findDOMNode(this.refs.swipecontent)
    swipeview.headerEl = ReactDOM.findDOMNode(this.refs.swipeheader)
    swipeview.setSizes()

    requestAnimationFrame(() => {
      if (this.props.routeParams.station.split('+').length === 1) {
        this.getData(this.props)
      } else {
        this.getMultiData(this.props)
      }
    })

    ReactDOM.findDOMNode(this.refs.scroll).addEventListener('scroll', this.triggerScroll)

    // now we call our function again to get the new times
    // every 30 seconds
    liveRefresh = setInterval(() => {
      if (this.props.routeParams.station.split('+').length === 1) {
        this.getData(this.props, true)
      } else {
        this.getMultiData(this.props, true)
      }
    }, 30000)
  }
  public componentWillUnmount() {
    // unbind our trigger so it doesn't have more updates
    StationStore.unbind('change', this.triggerUpdate)
    ReactDOM.findDOMNode(this.refs.scroll).removeEventListener('scroll', this.triggerScroll)

    // cancel all the requests
    //console.log('unmounting all')
    allRequests.forEach(function (request) {
      if (typeof(request) !== 'undefined') {
        request.abort()
      }
    })
    clearInterval(liveRefresh)
  }
  public componentWillReceiveProps(newProps) {
    //console.log('new props... killnug old requests')
    allRequests.forEach(function (request) {
      if (typeof(request) !== 'undefined') {
        request.abort()
      }
    })
    this.setState({
      name: '',
      description: '',
      stop: '',
      trips: [],
      realtime: {},
      loading: true,
      saveModal: false,
      webp: webp.support
    })
    // wait a second :/
    requestAnimationFrame(() => {
      if (this.props.routeParams.station.split('+').length === 1) {
        this.getData(newProps)
      } else {
        this.getMultiData(newProps)
      }
    })
  }
  public render() {
    var bgImage = {}
    var token = '?access_token=pk.eyJ1IjoiY29uc2luZG8iLCJhIjoiY2lza3ozcmd5MDZrejJ6b2M0YmR5dHBqdiJ9.Aeru3ssdT8poPZPdN2eBtg'
    var w = window.innerWidth
    if (w > 1280) {
      w = 1280
    }
    var x = this.state.stop_lon
    var y = this.state.stop_lat
    var z = 15
    if (typeof(x) === 'undefined') {
      x = 174.75
      y = -36.85
      z = 8
    }
    bgImage = {'backgroundImage': `url(https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/${x},${y},${z},0,0/${w}x149@2x${token}`}
    
    
    var icon = StationStore.getIcon(this.state.stop)
    var iconStr = this.state.description
    var iconPop
    if (icon === 'bus' && this.state.name !== '') {
      iconStr = 'Bus Stop ' + this.state.stop
    }
    if (icon !== 'train') {
      iconPop = <img className="iconPop" src={'/icons/' +icon +'-icon-2x.png'} />
    }

    var saveButton
    var addButton
    var cancelButton
    if (StationStore.getOrder().indexOf(this.props.routeParams.station) === -1) {
      saveButton = <span className="save" onClick={this.triggerSave}><img src="/icons/unsaved.svg" /></span>  
      cancelButton = 'Cancel'
      addButton = 'Add Stop'
    } else {
      saveButton = <span className="remove" onClick={this.triggerSave}><img src="/icons/saved.svg" /></span>
      cancelButton = 'Remove Stop'
      addButton = 'Rename'
    }

    var saveModal = 'saveModal'
    if (!this.state.saveModal) {
      saveModal += ' hidden'
    }

    var scrollable = 'scrollable'
    var loading = <div className="error">There are no services in the next two hours.</div>
    if (this.state.loading) {
      loading = (
        <div className="spinner" />
      )
    } else {
      scrollable += ' enable-scrolling'
    }

    return (
      <div className='station'>
        <div className={saveModal}>
          <div>
            <h2>Choose a Name</h2>
            <input type="text" value={this.state.name} onChange={this.triggerSaveChange} />
            <button className="cancel" onTouchTap={this.triggerSaveCancel}>{cancelButton}</button>
            <button className="submit" onTouchTap={this.triggerSaveAdd}>{addButton}</button>
          </div>
        </div>
        <header>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            {saveButton}
            <h1>{this.state.name}</h1>
            <h2>{iconStr}</h2>
          </div>
        </header>
        <ul className={scrollable}
            onTouchStart={this.triggerTouchStart}
            onTouchMove={this.triggerTouchMove}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
            ref="scroll">
          <div className="scrollwrap">
            <div className="bg" style={bgImage}>
              {iconPop}
              <div className="swipe-header bar" ref="swipeheader">
                <ul>
                  {
                    // there's a space in here because reasons of that's how the swipe plugin works
                  }
                  <li className=" active" onTouchTap={swipeview.navigate(0)}>All</li>
                  <li onTouchTap={swipeview.navigate(1)}>Inbound</li>
                  <li onTouchTap={swipeview.navigate(2)}>Outgoing</li>
                </ul>
                <div className="swipe-bar"></div>
              </div>
            </div>
            <div className="swipe-content" ref="swipecontent">
            <div className="swipe-pane">
            {loading}
            {this.state.trips.map((trip) => {
              if (typeof(trip.stop_sequence) === 'undefined') {
                return
              }
              var key = trip.trip_id + trip.stop_sequence.toString()
              return <TripItem 
                code={trip.route_short_name}
                time={trip.arrival_time_seconds}
                name={trip.trip_headsign}
                long_name={trip.route_long_name}
                key={key} // because what if they use a multistop
                trip_id={trip.trip_id}
                agency_id={trip.agency_id}
                station={trip.station}
                stop_code={this.props.routeParams.station}
                stop_sequence={trip.stop_sequence}
                realtime={this.state.realtime[trip.trip_id]}
               />
            })}
            </div>
            <div className="swipe-pane">
              <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint saecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            </div>
            <div className="swipe-pane">
              <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint saecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            </div>
            </div>
          </div>
        </ul>
      </div>
    )
  }
}
export default Station