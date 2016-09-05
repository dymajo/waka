import * as React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'

declare function require(name: string): any;
let request = require('reqwest')
let webp = require('../models/webp')

interface RealTimeItem {
  delay: number,
  stop_sequence: number,
  timestamp: number,
  double_decker: boolean
}
interface RealTimeMap {
  [name: string]: RealTimeItem;
}

interface ITripItemProps extends React.Props<TripItem> {
  code: string,
  name: string,
  time: string,
  trip_id: string,
  stop_sequence: number,
  color: string,
  realtime: RealTimeItem,
  agency_id: string
}

class TripItem extends React.Component<ITripItemProps, {}> {
  constructor(props: ITripItemProps) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
    this.getColor = this.getColor.bind(this)
  }
  public triggerClick() {
    console.log('navigating to', this.props.trip_id)
    // browserHistory.push(this.props.trip_id)
  }
  public getColor(){
    switch(this.props.agency_id){
      case 'AM': // Auckland Metro
        switch (this.props.code) {
          case 'WEST': // West Line
            return '#006553'
          case 'STH': // South Line
            return '#a60048'
          case 'EAST': // East Line
            return '#fec132'
          case 'PUK': // South Line
            return '#a60048'
          case 'ONE': // South Line
            return '#21b4e3'
          default:
            return '#17232f'
        }
      case 'FGL': // Fullers
        return '#2756a4'

      case 'HE': // Howick and Eastern
        return '#0096d6'

      case 'NZBGW': // NZ Bus - Go West
        return '#08ac54'

      case 'NZBML': // NZ Bus - metrolink
        switch (this.props.code) {
          case 'CTY': // City Link
            return '#ef3c34'

          case 'INN': // Inner Link
            return '#41b649'

          case 'OUT': // Outer Link
            return '#f7991c'
          
          default:
            return '#152a85'
        }

      case 'NZBNS': // NZ Bus - North Star
        return '#fcba2e'

      case 'NZBWP': // NZ Bus - Waka Pacific
        return '#0f91ab'

      case 'UE': // Urban Express
        return '#281260'

      case 'BTL': // Birkenhead Transport
        return '#b2975b'

      case 'RTH': // Ritchies
        switch (this.props.code) {
          case "NEX": // Northern Express
            return '#0079c2'
          
          default:
            return '#ff6f2c'
        }

      case 'WBC': // Waiheke Bus Company
        return '#01bdf2'

      case 'EXPNZ': // Explore Waiheke - supposed to be closed?
        return '#ffe81c'

      case 'BFL': // Belaire Ferries
        return '#ffd503'

      case 'ATAPT': // AT Airporter
        return '#f7931d'

      case 'PHH': // Pine Harbour / Sealink
        return '#d92732'

      case '360D': // 360 Discovery
        return '#2756a4'

      case 'ABEXP': //Skybus
        return '#ee3124'

      default: //MSB, PBC, BAYES - Schools
        return '#17232f'
    }
    


  }
  public render() {
    var arrival = new Date()
    arrival.setHours(0)
    arrival.setMinutes(0)
    arrival.setSeconds(parseInt(this.props.time))

    // makes times like 4:9 -> 4:09
    var minutes = arrival.getMinutes().toString()
    if (arrival.getMinutes() < 10) {
      minutes = '0' + minutes.toString()
    }
    var timestring = arrival.getHours() + ':' + minutes

    // works out how many stops away the bus is
    var stops_away = ''
    var stops_away_no
    if (this.props.realtime) {
      stops_away_no = this.props.stop_sequence - this.props.realtime.stop_sequence
      if (stops_away_no < 0) {
        stops_away = 'Departed' // let the rider down :(
      } else if (stops_away_no === 0) {
        stops_away = 'Arrived'
      } else if (stops_away_no === 1) {
        stops_away = stops_away_no + ' stop away'
      } else {
        stops_away = stops_away_no + ' stops away'
      }
      if (this.props.realtime.double_decker) {
        stops_away += ' Ⓜ️'
      }
    } else {
      stops_away = <span>Scheduled <time>{timestring}</time></span>
    }

    // logic for visibility
    var visibility = true
    // date check
    if (new Date().getTime() > arrival.getTime()) {
      visibility = false
    }
    // but if there's a stops away
    var active
    if (stops_away_no > -2) {
      visibility = true
      active = 'active'
    }
    // not sure if we need to do other checks?
    var className = ''
    if (!visibility) {
      className = 'hidden'
    }
    // remove train station because it's unecessary
    var name = this.props.name.replace(' Train Station', '')
    name = name.replace(' Ferry Terminal', '')

    return (
      <li className={className} onClick={this.triggerClick}><ul className={active}>
        <li>
          <div style={{backgroundColor: this.getColor()}}>
            {this.props.code}
          </div>
        </li>
        <li>{name}</li>
        <li>{stops_away}</li>
        <li>›</li>
      </ul></li>
    )
  }
  
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
  error: string,
  saveModal: boolean
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
      error: '',
      saveModal: false
    }
    this.setStatePartial = this.setStatePartial.bind(this)
    this.triggerSave = this.triggerSave.bind(this)
    this.triggerSaveAdd = this.triggerSaveAdd.bind(this)
    this.triggerSaveCancel = this.triggerSaveCancel.bind(this)
    this.triggerSaveChange = this.triggerSaveChange.bind(this)
    this.triggerRemove = this.triggerRemove.bind(this)
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
    // ugh i hate the || operator
    var name = this.state.name
    if (typeof(newState.name) !== 'undefined') {
      name = newState.name
    }

    // annoying because it's a boolean
    var saveModal = this.state.saveModal
    if (typeof(newState.saveModal) !== 'undefined') {
      saveModal = newState.saveModal
    }

    this.setState({
      name: name,
      description: newState.description || this.state.description,
      stop: newState.stop || this.state.stop,
      trips: newState.trips || this.state.trips,
      realtime: newState.realtime || this.state.realtime,
      error: newState.error || this.state.error,
      saveModal: saveModal
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
        this.setStatePartial({
          name: cachedName.name,
          description: cachedName.description,
          stop: newProps.routeParams.station
        })

      // If it's not cached, we'll just ask the server
      } else {
        allRequests[0] = request(`/a/station/${newProps.routeParams.station}`).then((data) => {
          this.setStatePartial({
            name: data.stop_name,
            description: `Stop ${this.props.routeParams.station} / ${data.stop_name}`,
            stop: this.props.routeParams.station
          })
        })
      }
    }

    allRequests[1] = request(`/a/station/${newProps.routeParams.station}/times`).then((data) => {
      console.log(data)
      // Seems like a server bug?
      if (typeof(data.trips.length) === 'undefined' || data.trips.length === 0) {
        return this.setStatePartial({
          error: 'There are no services in the next two hours.'
        })
      }

      data.trips.sort(tripsSort)
      this.setStatePartial({
        trips: data.trips,
        error: ''
      })

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
          realtime: rtData,
          error: ''
        })        
      })
    })
  }
  public triggerSave() {
    //var stopName = prompt("Give your station a name")
    //StationStore.addStop(this.props.routeParams.station, stopName)
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
    this.setStatePartial({
      saveModal: false
    })
  }
  public triggerSaveChange(e) {
    this.setStatePartial({
      name: e.currentTarget.value
    })
  }  
  public triggerRemove() {
    StationStore.removeStop(this.props.routeParams.station)
  }
  public componentDidMount() {
    this.getData(this.props)

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
    this.setStatePartial({
      name: '',
      description: '',
      stop: '',
      trips: [],
      realtime: {},
      error: '',
      saveModal: false
    })
    this.getData(newProps)
  }
  public render() {
    var bgImage = {}
    if (webp.support === false) {
      bgImage = {'backgroundImage': 'url(/a/map/' + this.props.routeParams.station + '.png)'}
    } else if (webp.support === true) {
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
    if (typeof(StationStore.getData()[this.props.routeParams.station]) === 'undefined') {
      saveButton = <span className="save" onClick={this.triggerSave}>Save</span>  
    } else {
      saveButton = <span className="remove" onClick={this.triggerRemove}>Remove</span>  
    }
    
    var iconString
    if (this.state.name != '') {
      iconString = <span className="icon"><img src={`/icons/${icon}.svg`} /></span>
    }
    var saveModal = 'saveModal'
    if (!this.state.saveModal) {
      saveModal += ' hidden'
    }

    return (
      <div className="station">
        <div className={saveModal}>
          <div>
            <h2>Choose a Name</h2>
            <input type="text" value={this.state.name} onChange={this.triggerSaveChange} />
            <button className="cancel" onClick={this.triggerSaveCancel}>Cancel</button>
            <button className="submit" onClick={this.triggerSaveAdd}>Add Stop</button>
          </div>
        </div>
        <header style={bgImage}>
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
        <ul className="scrollable">
          {this.state.error}
          {this.state.trips.map((trip) => {
            return <TripItem 
              color="#27ae60"
              code={trip.route_short_name}
              time={trip.arrival_time_seconds}
              name={trip.trip_headsign}
              key={trip.trip_id}
              trip_id={trip.trip_id}
              agency_id={trip.agency_id}
              stop_sequence={trip.stop_sequence}
              realtime={this.state.realtime[trip.trip_id]}
             />
          })}
        </ul>
      </div>
    )
  }
}
export default Station