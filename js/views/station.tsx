import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { iOS } from '../models/ios.ts'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'
import { SettingsStore } from '../stores/settingsStore.ts'
import TripItem from './tripitem.tsx'

const mapboxToken = 'pk.eyJ1IjoiY29uc2luZG8iLCJhIjoiY2lza3ozcmd5MDZrejJ6b2M0YmR5dHBqdiJ9.Aeru3ssdT8poPZPdN2eBtg'

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
  direction_id: number,
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
    container: (HTMLDivElement);
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
    this.triggerSwiped = this.triggerSwiped.bind(this)
    this.triggerBackSwiped = this.triggerBackSwiped.bind(this)
    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchMove = this.triggerTouchMove.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)

    StationStore.bind('change', this.triggerUpdate)
  }
  private toTile(lat, lng, zoom) {
    return [
      (lng+180)/360*Math.pow(2,zoom), // lng 
      (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom) //lat
    ]
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
  public triggerSwiped(index) {
    var len = swipeview.contentEl.children[index].children
    var h = 0
    for (var i=0; i<len.length; i++) {
      if (len[i].className !== 'hidden') {
        h += 48
      }
    }
    // remove one for extra element in first one
    if (index === 0) {
      h = h - 48
    }
    // oh fuck typescript with these fucking hacks
    var elemH = (ReactDOM.findDOMNode(this.refs.scroll) as any).offsetHeight
    if (h < elemH) {
      h = elemH
      if (this.state.trips.length * 48 < h-181) {
        h = h - 181
      }
    }
    return h
  }
  public triggerBackSwiped(swipedAway) {
    if (swipedAway) {
      var path = window.location.pathname.split('/')
      var i = path.indexOf(this.props.routeParams.station)
      // runs with the no animate flag
      UiStore.navigateSavedStations(path.slice(0,i).join('/'), true)
    }
  }
  public triggerTouchStart(e) {
    swipeview.contentTouchStart(e.nativeEvent)
    iOS.triggerStart(e)
  }
  public triggerTouchMove(e) {
    swipeview.contentTouchMove(e.nativeEvent, this.state.stickyScroll || this.state.loading)
  }
  public triggerTouchEnd(e) {
    swipeview.contentTouchEnd(e.nativeEvent, this.triggerSwiped)
  }
  public componentDidMount() {
    swipeview.index = 0
    swipeview.containerEl = ReactDOM.findDOMNode(this.refs.container)
    
    // only have back gesture on ios standalone
    if (iOS.detect() && (window as any).navigator.standalone) {
      swipeview.iOSBack = swipeview.containerEl
      swipeview.iOSBackCb = this.triggerBackSwiped
    }
    swipeview.contentEl = ReactDOM.findDOMNode(this.refs.swipecontent)
    swipeview.headerEl = ReactDOM.findDOMNode(this.refs.swipeheader)
    swipeview.setSizes()

    window.addEventListener('resize', swipeview.setSizes)

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
  public componentDidUpdate() {
    // this seems bad 
    swipeview.height = this.triggerSwiped(swipeview.index)
    swipeview.setSizes()
  }
  public componentWillUnmount() {
    window.removeEventListener('resize', swipeview.setSizes)
    
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
    swipeview.index = 0
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
    var bgImage = {}
    bgImage = {backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/${x},${y},${z},0,0/${w}x149@2x${token})`}
    
    
    var icon = StationStore.getIcon(this.state.stop)
    var iconStr = this.state.description
    var iconPop
    if (this.state.name !== '') {
      if (icon === 'bus') {
        iconStr = 'Bus Stop ' + this.state.stop
      }
      if (icon !== 'train') {
        iconPop = <img className="iconPop" src={'/icons/' +icon +'-icon-2x.png'} />
      }
    }
    if (window.innerWidth > 600) {
      bgImage = {}
      var latLng = this.toTile(this.state.stop_lat, this.state.stop_lon, 16)
      var offset = {marginTop: (latLng[1] - Math.floor(latLng[1])) * -108}
      var tiles = Math.ceil(window.innerWidth / 256)
      var url = new Array(tiles)

      // make one less tile to consider sidebar
      var path = window.location.pathname.split('/')
      var i = path.indexOf(this.props.routeParams.station)
      if (path.slice(0,i).join('/') === '/ss' && window.innerWidth > 900) {
        tiles = tiles -1
      }
      
      for (var i=0; i<tiles; i++) {
        var index = Math.ceil(i - tiles/2)
        url.push(`https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/16/${Math.floor(latLng[0])+index}/${Math.floor(latLng[1])}@2x?access_token=${mapboxToken}`)
      }
      iconPop = <div className="bgwrap">
        {url.map(function(item, index) {
          return <img src={item} key={index} style={offset} />
        })}
      </div>
    }

    if (this.state.loading && typeof(x) === 'undefined' || this.state.name === '') {
      // so we don't do extra http request
      iconPop = undefined
      bgImage = {}
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

    var inbound = []
    var outbound = []
    var all = []
    var inboundLabel = 'Inbound'
    this.state.trips.forEach((trip) => {
      if (typeof(trip.stop_sequence) === 'undefined') {
        return
      }
      var key = trip.trip_id + trip.stop_sequence.toString()
      var item = <TripItem 
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
      if (trip.direction_id === 0) {
        inbound.push(item)
        if (inboundLabel === 'Inbound') {
          var h = trip.trip_headsign
          // hardcoded because confusing AT uses different headsigns
          if (h.match('Britomart') || h === 'City Centre' || h === 'Civic Centre' || h.match('Downtown')) {
            inboundLabel = 'Citybound'
          }
        }
      } else {
        outbound.push(item)
      }
      all.push(item)
    })

    // draws the html
    var header
    var scrollwrap = 'scrollwrap'
    all = <div className="swipe-pane">{loading}{all}</div>
    if (inbound.length === 0 || outbound.length === 0) {
      header = <ul className="invisible"><li></li></ul>
      inbound = null
      outbound = null
      scrollwrap += ' offset'
    } else if (this.state.loading) {
      scrollwrap += ' offset'
    } else {
      outbound = <div className="swipe-pane">{outbound}</div>
      inbound = <div className="swipe-pane">{inbound}</div>
      var headerClass = ['','','']
      headerClass[swipeview.index]  = ' active'
      header = <ul>
        <li className={headerClass[0]} onTouchTap={swipeview.navigate(0, this.triggerSwiped)}>All</li>
        <li className={headerClass[1]} onTouchTap={swipeview.navigate(1, this.triggerSwiped)}>Outbound</li>
        <li className={headerClass[2]} onTouchTap={swipeview.navigate(2, this.triggerSwiped)}>{inboundLabel}</li>
      </ul>
    }

    return (
      <div className='station' ref="container">
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
          <div className={scrollwrap}>
            <div className="bg" style={bgImage}>
              {iconPop}
              <div className="shadow-bar">
                <div className="swipe-header bar" ref="swipeheader">
                  {header}
                  <div className="swipe-bar"></div>
                </div>
              </div>
            </div>
            <div className="swipe-content" ref="swipecontent">
              {all}
              {outbound}
              {inbound}
            </div>
          </div>
        </ul>
      </div>
    )
  }
}
export default Station