import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { iOS } from '../models/ios.js'
import { webp } from '../models/webp'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import TripItem from './tripitem.jsx'

let swipeview = require('../swipeviewjs/swipe.js')

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

class Station extends React.Component {
  constructor(props) {
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
      stop_lon: undefined,
      animationFinished: false
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
  toTile(lat, lng, zoom) {
    return [
      (lng+180)/360*Math.pow(2,zoom), // lng 
      (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom) //lat
    ]
  }
  // from https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
  getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    var deg2rad = function(deg) {
      return deg * (Math.PI/180)
    }
    var R = 6371 // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1)  // deg2rad below
    var dLon = deg2rad(lon2-lon1) 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    var d = R * c // Distance in km
    return d
  }
  setStatePartial(newState) {
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
  triggerUpdate() {
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
  getData(newProps, refreshMode = false) {
    // don't do this
    if (!refreshMode) {
      var getStationData = () => {
        allRequests[0] = fetch(`/a/station/${newProps.routeParams.station}`).then((response) => {
          response.json().then((data) => {
            requestAnimationFrame(() => {
              var name = data.stop_name.replace(' Train Station', '')
              name = name.replace(' Ferry Terminal', '')

              this.setState({
                name: name,
                description: `${data.stop_name}`,
                stop: this.props.routeParams.station,
                stop_lat: data.stop_lat, 
                stop_lon: data.stop_lon
              })
            })
          })
        })
      }
      var cachedName = StationStore.getData()[newProps.routeParams.station]
      if (typeof(cachedName) !== 'undefined') {
        // workaround for users upgrading from v0.1 to v0.2
        // lat, lng didn't used to be sent, now it is
        if (typeof(cachedName.stop_lon) === 'undefined') {
          getStationData()
        } else {
          requestAnimationFrame(() => {
            this.setState({
              name: cachedName.name,
              description: cachedName.description,
              stop: newProps.routeParams.station,
              stop_lat: cachedName.stop_lat, 
              stop_lon: cachedName.stop_lon
            })
          })
        }

      // If it's not cached, we'll just ask the server
      } else {
        getStationData()
      }
    }

    allRequests[1] = fetch(`/a/station/${newProps.routeParams.station}/times`).then((response) => {
      response.json().then((data) => {
        this.tripsCb(data.trips)
      })
    })
  }
  getMultiData(newProps, refreshMode = false) {
    var stations = newProps.routeParams.station.split('+')
    // too many stations
    if (stations.length > 7) {
      return this.setState({
        loading: false
      })
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
        fetch(`/a/station/${station}/times`).then((response) => {
          response.json().then((data) => {
            data.trips.forEach(function(trip) {
              trip.station = station
              tripData.push(trip)
            })
            resolve()
          })
        })
      }))
    })

    Promise.all(promises).then(() => {
      this.tripsCb(tripData)
    })

  }
  tripsCb(tripData) {
    if (typeof(tripData.length) === 'undefined' || tripData.length === 0) {
      return this.setStatePartial({
        loading: false
      })
    }
    tripData.sort(tripsSort)

    this.setState({
      trips: tripData,
      loading: false
    })

    // realtime request for buses and trains
    // not ferries though
    if (tripData[0].route_type === '4') {
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

    // we need to pass an extra param for train trips
    var requestData
    if (tripData[0].route_type === '2') {
      requestData = JSON.stringify({
        trips: queryString,
        train: true
      })
    } else {
      requestData = JSON.stringify({trips: queryString})
    }
    // now we do a request to the realtime API
    allRequests[2] = fetch('/a/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestData
    }).then((response) => {
      response.json().then((rtData) => {
        if (tripData[0].route_type === '2') {
          for (var key in rtData) {
            rtData[key] = {
              v_id: rtData[key].v_id,
              distance: this.getDistanceFromLatLonInKm(rtData[key].latitude, rtData[key].longitude, this.state.stop_lat, this.state.stop_lon)
            }
          }
        } 
        this.setState({
          realtime: rtData
        })
      })
    })
  }
  triggerBack() {
    UiStore.navigateSavedStations('/')
  }
  triggerSave() {
    this.setStatePartial({
      saveModal: true
    })
    setTimeout(() => {
      ReactDOM.findDOMNode(this.refs.saveInput).focus()
    }, 200)
  }
  triggerSaveAdd() {
    this.setStatePartial({
      saveModal: false
    })
    StationStore.addStop(this.props.routeParams.station, this.state.name);
    ReactDOM.findDOMNode(this.refs.saveInput).blur()
  }
  triggerSaveCancel() {
    StationStore.removeStop(this.props.routeParams.station)
    this.setStatePartial({
      saveModal: false
    })
    ReactDOM.findDOMNode(this.refs.saveInput).blur()
  }
  triggerSaveChange(e) {
    this.setStatePartial({
      name: e.currentTarget.value
    })
  }
  triggerScroll(e) {
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
  triggerSwiped(index) {
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
    var elemH = ReactDOM.findDOMNode(this.refs.scroll).offsetHeight
    if (h < elemH) {
      h = elemH
      if (this.state.trips.length * 48 < h-181) {
        h = h - 181
      }
    }
    return h
  }
  triggerBackSwiped(swipedAway) {
    if (swipedAway) {
      // runs with the no animate flag
      UiStore.navigateSavedStations('/', true)
    }
  }
  triggerTouchStart(e) {
    swipeview.contentTouchStart(e.nativeEvent)
    iOS.triggerStart(e)
  }
  triggerTouchMove(e) {
    swipeview.contentTouchMove(e.nativeEvent, this.state.stickyScroll || this.state.loading)
  }
  triggerTouchEnd(e) {
    swipeview.contentTouchEnd(e.nativeEvent, this.triggerSwiped)
  }
  componentDidMount() {
    swipeview.index = 0
    swipeview.containerEl = ReactDOM.findDOMNode(this.refs.container)
    
    // only have back gesture on ios standalone
    if (iOS.detect() && window.navigator.standalone) {
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

    setTimeout(() => {
      this.setState({
        animationFinished: true
      })
    }, 275)

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
  componentDidUpdate() {
    // this seems bad 
    swipeview.height = this.triggerSwiped(swipeview.index)
    swipeview.setSizes()

    if (this.props.children === null && this.state.name !== '') {
      document.title = this.state.name + ' - Transit'
    }
  }
  componentWillUnmount() {
    window.removeEventListener('resize', swipeview.setSizes)
    
    // unbind our trigger so it doesn't have more updates
    StationStore.unbind('change', this.triggerUpdate)
    ReactDOM.findDOMNode(this.refs.scroll).removeEventListener('scroll', this.triggerScroll)

    // cancel all the requests
    //console.log('unmounting all')
    allRequests.forEach(function (request) {
      if (typeof(request) !== 'undefined') {
        // Can't do this with the request api ugh
        // request.abort()
      }
    })
    clearInterval(liveRefresh)
  }
  componentWillReceiveProps(newProps) {
    // basically don't do anything if the station doesn't change
    if (this.props.params.station === newProps.params.station) {
      return
    }

    const cb = () => {
      swipeview.index = 0
      //console.log('new props... killnug old requests')
      allRequests.forEach(function (request) {
        if (typeof(request) !== 'undefined') {
          // Can't do this with the request api ugh
          // request.abort()
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

    if (newProps.location.pathname.split('/').length > 3) {
      setTimeout(cb, 300)
    // } else if (newProps.location.pathname.split('/').length !== this.props.location.pathname.split('/').length) {
    //   console.log('probably going forward')
    //   cb()
    } else {
      cb()
    }
  }
  render() {
    var icon = StationStore.getIcon(this.state.stop)
    var iconStr = this.state.description
    var iconPop

    let className = 'station'
    if (this.props.children === null && this.state.animationFinished) {
      className += ' level-1'
    }
    
    if (this.state.name !== '') {
      if (icon === 'bus') {
        iconStr = 'Bus Stop ' + this.state.stop
      }
      iconPop = <img className="iconPop" src={'/icons/' +icon +'-icon-2x.png'} />
    }

    var latLng = this.toTile(this.state.stop_lat, this.state.stop_lon, 16)
    var tiles = Math.ceil((window.innerWidth+256) / 256)
    var offsetLeft = window.innerWidth/2 + (-256*Math.floor(tiles/2)) + latLng[0]%1 * -256
    var offsetTop = (148/2) + Math.round((latLng[1]%1 * -256))
    var offsetx = {marginLeft:offsetLeft}
    var url = new Array(tiles)
    var urlx = new Array(tiles)
    var kill = false

    // if it overflows, we need to basically move everything
    if (offsetTop > 0) {
      latLng[1] += -1
      offsetTop += -256
    // prevent unecessary requests
    } else if (offsetTop > -108) {
      kill = true
    }

    for (var i=0; i<tiles; i++) {
      var index = Math.ceil(i - tiles/2)
      url[i] = `https://maps.dymajo.com/osm_tiles/16/${Math.floor(latLng[0])+index}/${Math.floor(latLng[1])}.png`
      urlx[i] = `https://maps.dymajo.com/osm_tiles/16/${Math.floor(latLng[0])+index}/${Math.floor(latLng[1]+1)}.png`
    }

    var offset = {marginTop: offsetTop, marginLeft: offsetLeft}

    if (this.state.loading && typeof(this.state.stop_lat) === 'undefined' || this.state.name === '') {
      // so we don't do extra http request
      iconPop = undefined
      offset = undefined
      url = []
      kill = true 
    }

    if (kill === true) {
      offsetx = undefined
      urlx = []
    }

    var saveButton
    var addButton
    var cancelButton
    if (StationStore.getOrder().indexOf(this.props.routeParams.station) === -1) {
      saveButton = <span className="save" onTouchTap={this.triggerSave}><img src="/icons/unsaved.svg" /></span>  
      cancelButton = 'Cancel'
      addButton = 'Add Stop'
    } else {
      saveButton = <span className="remove" onTouchTap={this.triggerSave}><img src="/icons/saved.svg" /></span>
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
    this.state.trips.forEach((trip, index) => {
      if (typeof(trip.stop_sequence) === 'undefined') {
        return
      }
      if (trip.route_short_name === 'OUT') {
        if (trip.direction_id === '0') {
          trip.trip_headsign = 'Clockwise Outer Link'
        } else {
          trip.trip_headsign = 'Anticlockwise Outer Link'
        }
      } else if (trip.route_short_name === 'INN') {
        if (trip.direction_id === '0') {
          trip.trip_headsign = 'Clockwise Inner Link'
        } else {
          trip.trip_headsign = 'Anticlockwise Inner Link'
        }
      } else if (trip.route_short_name === 'CTY') {
        trip.trip_headsign = 'City Link'
      }
      var key = trip.trip_id + index
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
      if (trip.direction_id === '0') {
        inbound.push(item)
        // if (inboundLabel === 'Inbound') {
          // Removed for Now
          // var h = trip.trip_headsign
          // // hardcoded because confusing AT uses different headsigns
          // if (h.match('Britomart') || h === 'City Centre' || h === 'Civic Centre' || h.match('Downtown')) {
          //   inboundLabel = 'Citybound'
          // }
        // }
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
      <div className={className} ref="container">
        <div className={saveModal}>
          <div>
            <h2>Choose a Name</h2>
            <input type="text" value={this.state.name} onChange={this.triggerSaveChange} ref="saveInput" />
            <button className="cancel" onTouchTap={this.triggerSaveCancel}>{cancelButton}</button>
            <button className="submit" onTouchTap={this.triggerSaveAdd}>{addButton}</button>
          </div>
        </div>
        <header className="material-header">
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
            <div className="bg">
              {iconPop}
              <div className="bgwrap">
                <div style={offset}>
                  {url.map(function(item, index) {
                    return <img src={item} key={index} />
                  })}
                </div>
                <div style={offsetx}>
                  {urlx.map(function(item, index) {
                    return <img src={item} key={index} />
                  })}
                </div>
              </div>
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
        {this.props.children && React.cloneElement(this.props.children, {
          trips: this.state.trips,
          realtime: this.state.realtime,
          stopInfo: [this.state.stop_lat, this.state.stop_lon]
        })}
      </div>
    )
  }
}
export default Station