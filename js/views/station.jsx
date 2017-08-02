import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { iOS } from '../models/ios.js'
import { webp } from '../models/webp'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import TripItem from './tripitem_new.jsx'
import zenscroll from 'zenscroll'

// hack
let liveRefresh = undefined
let allRequests = [undefined, undefined, undefined]

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
      stop_lat: undefined,
      stop_lon: undefined,
      runAnimation: false,
      fancyMode: false,
      currentTrips: [],
      definedOrder: [],
    }
    this.setStatePartial = this.setStatePartial.bind(this)
    this.triggerBack = this.triggerBack.bind(this)
    this.triggerSave = this.triggerSave.bind(this)
    this.triggerSaveAdd = this.triggerSaveAdd.bind(this)
    this.triggerSaveCancel = this.triggerSaveCancel.bind(this)
    this.triggerSaveChange = this.triggerSaveChange.bind(this)
    this.triggerUpdate = this.triggerUpdate.bind(this)
    this.triggerScroll = this.triggerScroll.bind(this)
    this.triggerScrollTap = this.triggerScrollTap.bind(this)
    this.triggerTouchStart = this.triggerTouchStart.bind(this)
    this.triggerTouchEnd = this.triggerTouchEnd.bind(this)
    this.reduceTrips = this.reduceTrips.bind(this)
    this.getRealtimeData = this.getRealtimeData.bind(this)
    this.realtimeCb = this.realtimeCb.bind(this)
    this.expandChange = this.expandChange.bind(this)
    this.goingBack = this.goingBack.bind(this)

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
        const cb = (data) => {
          var name = data.stop_name.replace(' Train Station', '')
          name = name.replace(' Ferry Terminal', '')

          this.setState({
            name: name,
            description: `${data.stop_name}`,
            stop: this.props.routeParams.station,
            stop_lat: data.stop_lat, 
            stop_lon: data.stop_lon || data.stop_lng // horrible api design, probs my fault, idk
          })
        }
        if (typeof(StationStore.stationCache[newProps.routeParams.station]) !== 'undefined') {
          return cb(StationStore.stationCache[newProps.routeParams.station])
        }
        allRequests[0] = fetch(`/a/nz-akl/station/${newProps.routeParams.station}`).then((response) => {
          response.json().then(cb)
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

    allRequests[1] = fetch(`/a/nz-akl/station/${newProps.routeParams.station}/times`).then((response) => {
      response.json().then((data) => {
        this.tripsCb(data.trips, data.realtime)
      })
    })
  }
  getMultiData(newProps, refreshMode = false) {
    // TODO
   return
  }
  tripsCb(tripData, rtData) {
    if (typeof(tripData) === 'undefined' || typeof(tripData.length) === 'undefined' || tripData.length === 0) {
      // scroll when loaded
      if (this.state.trips.length === 0 && this.state.fancyMode && this.refs.scroll.scrollTop === 71) {
        requestAnimationFrame(() => {
          this.scroller.toY(250)
        })
      }

      return this.setStatePartial({
        loading: false
      })
    }

    if (this.state.trips.length === 0 && this.state.fancyMode && this.refs.scroll.scrollTop === 71 && tripData[0].route_type !== '3') {
      requestAnimationFrame(() => {
        this.scroller.toY(250)
      })
    }

    if (Object.keys(rtData).length > 0) {
      return this.realtimeCb(tripData, rtData)
    }

    this.setState({
      trips: tripData,
      loading: false
    })

    this.reduceTrips(tripData)
    this.getRealtimeData(tripData)
  }
  getRealtimeData(tripData) {
    // realtime request for buses and trains
    // not ferries though
    if (tripData[0].route_type === '4') {
      return
    }

    var queryString = []
    tripData.forEach(function(trip) {
      var arrival = new Date()
      if (arrival.getHours() < 5) {
        arrival.setDate(arrival.getDate() - 1)
      }
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.departure_time_seconds))

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
    allRequests[2] = fetch('/a/nz-akl/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestData
    }).then((response) => {
      response.json().then((rtData) => {
        this.realtimeCb(tripData, rtData)
      })
    })
  }
  realtimeCb(tripData, rtData) {
    if (tripData[0].route_type === '2') {
      for (var key in rtData) {
        rtData[key] = {
          v_id: rtData[key].v_id,
          distance: this.getDistanceFromLatLonInKm(rtData[key].latitude, rtData[key].longitude, this.state.stop_lat, this.state.stop_lon)
        }
      }
    } 
    if (Object.keys(this.state.realtime).length === 0 && this.state.fancyMode && this.refs.scroll.scrollTop === 71 && tripData[0].route_type === '3') {
      requestAnimationFrame(() => {
        this.scroller.toY(250)
      })
    }
    this.setState({
      trips: tripData,
      loading: false,
      realtime: rtData
    })
    this.reduceTrips(tripData, rtData)
  }
  reduceTrips(data, rtData = {}) {
    const reducer = new Map()
    data.forEach((trip, index) => {
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
      if (rtData[trip.trip_id] && rtData[trip.trip_id].delay) {
        if (trip.stop_sequence - rtData[trip.trip_id].stop_sequence < 0) {
          return
        }
      } else if (false) {
        // do something with the trains?
      } else {
        const arrival = new Date()
        arrival.setHours(0)
        arrival.setMinutes(0)
        arrival.setSeconds(parseInt(trip.departure_time_seconds) % 86400)
        // Let buses be 2 mins late
        if (Math.round((arrival - new Date()) / 60000) < -2) {
          return
        }
      }
      // this is a GROUP BY basically
      if (!reducer.has(trip.route_short_name)) {
        reducer.set(trip.route_short_name, new Map())
      }
      // removes platforms and weirdness
      // this line doesn't group as well
      // let lname = trip.route_long_name.replace(/ \d/g, '').toLowerCase()
      let lname = trip.route_short_name + trip.trip_headsign + ' via' + (trip.route_long_name.toLowerCase().split('via')[1] || '')
      if (!reducer.get(trip.route_short_name).has(lname)) {
        reducer.get(trip.route_short_name).set(lname, [])
      }
      reducer.get(trip.route_short_name).get(lname).push(trip)  
    })
    let all = []
    let same = true
    reducer.forEach((value, key) => {
      if (this.state.definedOrder.indexOf(key) === -1) {
        same = false
      }
    })
    const sortFn = function(a, b) {
      return a[1][0].stop_sequence - b[1][0].stop_sequence
    }
    if (this.state.definedOrder.length === 0 || same === false) {
      let newOrder = []
      reducer.forEach((value, key) => {
        // looks for duplicated headsigns, and adds vias.
        const duplicates = [...value.keys()].map(i => i.split(' via')[0]).reduce((result, item) => {
          if (item in result) {
            result[item] = 1
          } else {
            result[item] = 0
          }
          return result
        }, {});

        [...value.entries()].sort(sortFn).forEach((tripCollection) => {
          tripCollection.push(false)
          if (duplicates[tripCollection[0].split(' via')[0]] > 0) {
            tripCollection[2] = true
          }
          all.push(tripCollection)
        })
        if (Object.keys(this.state.realtime).length > 0) {
          newOrder.push(key)
        }
      })
      this.setState({
        currentTrips: all,
        definedOrder: newOrder,
      })
    } else {
      this.state.definedOrder.forEach((key) => {
        const data = reducer.get(key)
        if (typeof(data) !== 'undefined') {
          [...data.entries()].sort(sortFn).forEach((tripCollection) => {
            all.push(tripCollection)
          })
        }
      })
      this.setState({
        currentTrips: all,
      })
    }
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
  triggerTouchStart(e) {
    iOS.triggerStart(e)
    this.isBeingTouched = true
  }
  triggerTouchEnd() {
    this.isBeingTouched = false
    if (this.refs.scroll.scrollTop < 40 && this.state.fancyMode) {
      UiStore.navigateSavedStations('/')
    }
  }
  triggerScroll(e) {
    const pos = e.currentTarget.scrollTop
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      if (pos < 40 && !this.isBeingTouched && this.state.fancyMode) {
        UiStore.navigateSavedStations('/')
      }
    }, 50)
  }
  triggerScrollTap(e) {
    if (e.target.className.match('scrollwrap') && this.state.fancyMode) {
      UiStore.navigateSavedStations('/')
    }
  }
  componentWillMount() {
    // doesn't load fancymode on desktop :) 
    this.setState({
      runAnimation: true,
      fancyMode: UiStore.state.fancyMode && window.innerWidth <= 850
    })
    setTimeout(() => {
      this.setState({
        runAnimation: false
      })
    }, UiStore.animationTiming)
  }
  componentDidMount() {
    requestAnimationFrame(() => {
      this.getData(this.props)
    })
    // scroll top header into view
    if (this.state.fancyMode) {
      this.refs.scroll.scrollTop = 71
    }

    // times: every 3 minutes
    // realtime: every 20 seconds
    liveRefresh = setInterval(() => {
      this.getData(this.props)
    }, 180000)
    liveRefresh = setInterval(() => {
      this.getRealtimeData(this.state.trips)
    }, 20000)

    UiStore.bind('goingBack', this.goingBack)
    UiStore.bind('expandChange', this.expandChange)

    this.scroller = zenscroll.createScroller(this.refs.scroll)
  }
  componentDidUpdate() {
    if (this.props.children === null && this.state.name !== '') {
      document.title = this.state.name + ' - Transit'
    }
  }
  componentWillUnmount() {    
    StationStore.unbind('change', this.triggerUpdate)
    UiStore.unbind('expandChange', this.expandChange)

    // cancel all the requests
    //console.log('unmounting all')
    allRequests.forEach(function (request) {
      if (typeof(request) !== 'undefined') {
        // Can't do this with the request api ugh
        // request.abort()
      }
    })
    clearInterval(liveRefresh)

    UiStore.unbind('goingBack', this.goingBack)
  }
  expandChange(item) {
    setTimeout(() => {
      const itemPos = this.refs.swipecontent.children[item[1]].getBoundingClientRect()
      if (itemPos.height > 72 && itemPos.top + itemPos.height > document.documentElement.clientHeight) {
        // calculates how much it overflows and adds it
        const overflowAmount = itemPos.top + itemPos.height - document.documentElement.clientHeight
        this.refs.scroll.scrollTop = this.refs.scroll.scrollTop + overflowAmount
      }
    }, 250)
  }
  goingBack() {
    if (UiStore.state.goingBack && this.props.children === null) {
      this.setState({
        goingBack: true
      })
    }
  }
  componentWillReceiveProps(newProps) {
    // basically don't do anything if the station doesn't change
    if (this.props.params.station === newProps.params.station) {
      setTimeout(() => {
        if (this.state.fancyMode) {
          this.setState({
            fancyMode: false
          })
        }
      }, 300)
      return
    }

    const cb = () => {
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
        webp: webp.support,
        currentTrips: [],
        definedOrder: [],
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

    let topIcon = <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
    let className = 'station'
    if (this.state.fancyMode) {
      className += ' fancy'
      if (this.state.name !== '') {
        topIcon = <span className="back mode"><img src={`/icons/${icon}-dark.svg`} /></span>
      }
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
    var dark  = this.state.fancyMode ? '-dark' : ''
    if (StationStore.getOrder().indexOf(this.props.routeParams.station) === -1) {
      saveButton = <span className="save" onTouchTap={this.triggerSave}><img src={'/icons/unsaved' + dark + '.svg'} /></span>  
      cancelButton = 'Cancel'
      addButton = 'Add Stop'
    } else {
      saveButton = <span className="remove" onTouchTap={this.triggerSave}><img src={'/icons/saved' + dark + '.svg'} /></span>
      cancelButton = 'Remove Stop'
      addButton = 'Rename'
    }

    var saveModal = 'saveModal'
    if (!this.state.saveModal) {
      saveModal += ' hidden'
    }

    var scrollable = 'scrollable'
    var loading
    if (this.state.loading) {
      loading = (
        <div className="spinner" />
      )
    } else {
      scrollable += ' enable-scrolling'
    }

    let all = this.state.currentTrips.map((item, key) => {
      return <TripItem key={item[0]} collection={item[1]} realtime={this.state.realtime} index={key} vias={item[2]} />
    })

    // realtime check needed?
    if (all.length === 0 && this.state.loading === false) {
      loading = <div className="error">There are no services in the next two hours.</div>
    }

    // draws the html
    var header
    var scrollwrap = 'scrollwrap offset'
    let styles = {}
    if (this.state.fancyMode) {
      if (this.state.runAnimation && UiStore.getModalAnimationIn()) {
        styles.animation = UiStore.getModalAnimationIn()
      } else if (this.state.goingBack) {
        Object.assign(styles, UiStore.getModalAnimationOut())
      }
    } else {
      if (this.state.runAnimation && UiStore.getAnimationIn()) {
        styles.animation = UiStore.getAnimationIn()
      } else if (this.state.goingBack) {
        Object.assign(styles, UiStore.getAnimationOut())
      }
    }

    var header = (
      <header className="material-header">
        <div>
          {topIcon}
          {saveButton}
          <h1>{this.state.name}</h1>
          <h2>{iconStr}</h2>
        </div>
      </header>
    )
    let headerPos = [header, null]
    if (this.state.fancyMode) {
      headerPos = [null, header]
    }

    return (
      <div className={className} ref="container" style={styles}>
        <div className={saveModal}>
          <div>
            <h2>Choose a Name</h2>
            <input type="text" value={this.state.name} onChange={this.triggerSaveChange} ref="saveInput" />
            <button className="cancel" onTouchTap={this.triggerSaveCancel}>{cancelButton}</button>
            <button className="submit" onTouchTap={this.triggerSaveAdd}>{addButton}</button>
          </div>
        </div>
        {headerPos[0]}
        <ul className={scrollable}
            ref="scroll"
            onTouchTap={this.triggerScrollTap}
            onScroll={this.triggerScroll}
            onTouchStart={this.triggerTouchStart}
            onTouchEnd={this.triggerTouchEnd}
            onTouchCancel={this.triggerTouchEnd}
          >
          <div className={scrollwrap}>
            {headerPos[1]}
            <div className="swipe-content" ref="swipecontent">
              {loading}{all}
            </div>
          </div>
        </ul>
        {this.props.children && React.cloneElement(this.props.children, {
          stopName: this.state.name,
          trips: this.state.trips,
          realtime: this.state.realtime,
          stopInfo: [this.state.stop_lat, this.state.stop_lon]
        })}
      </div>
    )
  }
}
export default Station