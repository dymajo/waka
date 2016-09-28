import * as React from 'react'
import { iOS } from '../models/ios.ts'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'
import { SettingsStore } from '../stores/settingsStore.ts'
import TripItem from './tripitem.tsx'

declare function require(name: string): any;
let request = require('reqwest')
let webp = require('../models/webp')

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
  name: string,
  description: string,
  stop: string,
  trips: Array<ServerTripItem>,
  realtime: RealTimeMap,
  loading: boolean,
  saveModal: boolean,
  webp: boolean
}

// hack
let liveRefresh = undefined
let allRequests = [undefined, undefined, undefined]

class Station extends React.Component<IAppProps, IAppState> {
  public state : IAppState

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
      webp: webp.support
    }
    this.setStatePartial = this.setStatePartial.bind(this)
    this.triggerBack = this.triggerBack.bind(this)
    this.triggerSave = this.triggerSave.bind(this)
    this.triggerSaveAdd = this.triggerSaveAdd.bind(this)
    this.triggerSaveCancel = this.triggerSaveCancel.bind(this)
    this.triggerSaveChange = this.triggerSaveChange.bind(this)
    this.triggerUpdate = this.triggerUpdate.bind(this)

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
    var tripsSort = function(a,b) {
      return a.arrival_time_seconds - b.arrival_time_seconds
    }
    // don't do this
    if (!refreshMode) {
      var cachedName = StationStore.getData()[newProps.routeParams.station]
      if (typeof(cachedName) !== 'undefined') {
        requestAnimationFrame(() => {
          this.setStatePartial({
            name: cachedName.name,
            description: cachedName.description,
            stop: newProps.routeParams.station
          })
        })

      // If it's not cached, we'll just ask the server
      } else {
        allRequests[0] = request(`/a/station/${newProps.routeParams.station}`).then((data) => {
          requestAnimationFrame(() => {
            var name = data.stop_name.replace(' Train Station', '')
            name = name.replace(' Ferry Terminal', '')

            this.setStatePartial({
              name: name,
              description: `Stop ${this.props.routeParams.station} / ${data.stop_name}`,
              stop: this.props.routeParams.station
            })
          })
        })
      }
    }

    allRequests[1] = request(`/a/station/${newProps.routeParams.station}/times`).then((data) => {
      //console.log(data)
      // Seems like a server bug?
      if (typeof(data.trips.length) === 'undefined' || data.trips.length === 0) {
        return this.setStatePartial({
          loading: false
        })
      }

      data.trips.sort(tripsSort)
      this.setStatePartial({
        trips: data.trips,
        loading: false
      })

      // only realtime request for buses
      if (data.trips[0].route_type !== 3) {
        return
      }

      var queryString = []
      data.trips.forEach(function(trip) {
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
  public componentDidMount() {
    requestAnimationFrame(() => {
      this.getData(this.props)
    })

    // now we call our function again to get the new times
    // every 30 seconds
    liveRefresh = setInterval(() => {
      this.getData(this.props, true)
    }, 30000)
  }
  public componentWillUnmount() {
    // unbind our trigger so it doesn't have more updates
    StationStore.unbind('change', this.triggerUpdate)

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
      this.getData(newProps)
    })
  }
  public render() {
    var bgImage = {}
    if (this.state.webp === false) {
      bgImage = {'backgroundImage': 'url(/a/map/' + this.props.routeParams.station + '.png)'}
    } else if (this.state.webp === true) {
      bgImage = {'backgroundImage': 'url(/a/map/' + this.props.routeParams.station + '.webp)'}
    }

    var time = new Date()

    // makes times like 4:9 -> 4:09
    var minutes = time.getMinutes().toString()
    if (time.getMinutes() < 10) {
      minutes = '0' + minutes.toString()
    }
    var timestring = <time><span>{time.getHours()}</span><span className="blink">:</span><span>{minutes}</span></time>

    var icon = StationStore.getIcon(this.state.stop)

    var saveButton
    var addButton
    var cancelButton
    if (StationStore.getOrder().indexOf(this.props.routeParams.station) === -1) {
      saveButton = <span className="save" onClick={this.triggerSave}>Save</span>  
      cancelButton = 'Cancel'
      addButton = 'Add Stop'
    } else {
      saveButton = <span className="remove" onClick={this.triggerSave}>Saved</span>
      cancelButton = 'Remove Stop'
      addButton = 'Rename'
    }
    
    var iconString
    if (this.state.name != '') {
      iconString = <span className="icon"><img src={`/icons/${icon}.svg`} /></span>
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

    var clockState
    if (!SettingsStore.getState().clock) {
      clockState = 'disable-clock'
    }

    return (
      <div className="station">
        <div className={saveModal}>
          <div>
            <h2>Choose a Name</h2>
            <input type="text" value={this.state.name} onChange={this.triggerSaveChange} />
            <button className="cancel" onTouchTap={this.triggerSaveCancel}>{cancelButton}</button>
            <button className="submit" onTouchTap={this.triggerSaveAdd}>{addButton}</button>
          </div>
        </div>
        <header className={clockState} style={bgImage}>
          <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
          {saveButton}
          <div>
            {iconString}
            {timestring}
            <h1>{this.state.name}</h1>
            <h2>{this.state.description}</h2>
          </div>
        </header>
        <ul>
          <li className="header">
            <ul>
              <li>Route</li>
              <li>Destination</li>
              <li>Status</li>
            </ul>
          </li>
        </ul>
        <ul className={scrollable} onTouchStart={iOS.triggerStart}>
          <div className="scrollwrap">
            {loading}
            {this.state.trips.map((trip) => {
              return <TripItem 
                code={trip.route_short_name}
                time={trip.arrival_time_seconds}
                name={trip.trip_headsign}
                long_name={trip.route_long_name}
                key={trip.trip_id}
                trip_id={trip.trip_id}
                agency_id={trip.agency_id}
                stop_sequence={trip.stop_sequence}
                realtime={this.state.realtime[trip.trip_id]}
               />
            })}
          </div>
        </ul>
      </div>
    )
  }
}
export default Station