import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import SearchSwitch from './searchswitch.jsx'

let leaflet = require('react-leaflet')
let Map = leaflet.Map
let Marker = leaflet.Marker
let Popup = leaflet.Popup
let TileLayer = leaflet.TileLayer
let ZoomControl = leaflet.ZoomControl
let Icon = require('leaflet').icon
let Circle = leaflet.Circle
let CircleMarker = leaflet.CircleMarker

const busIcon = Icon({
  iconUrl: '/icons/bus-icon.png',
  iconRetinaUrl: '/icons/bus-icon-2x.png',
  iconSize: [25, 41]
})
const trainIcon = Icon({
  iconUrl: '/icons/train-icon.png',
  iconRetinaUrl: '/icons/train-icon-2x.png',
  iconSize: [30, 49]
})
const ferryIcon = Icon({
  iconUrl: '/icons/ferry-icon.png',
  iconRetinaUrl: '/icons/ferry-icon-2x.png',
  iconSize: [30, 49]
})
let geoID = undefined

class Search extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      station: '',
      stops: [],
      position: [-36.844229, 174.767823],
      currentPosition: [0,0],
      back: false,
      accuracy: 0,
      error: '',
      findModal: false
    }
  
    this.watchPosition = this.watchPosition.bind(this)
    this.getAndSetCurrentPosition = this.getAndSetCurrentPosition.bind(this)
    this.setCurrentPosition = this.setCurrentPosition.bind(this)
    this.currentLocateButton = this.currentLocateButton.bind(this)
    this.toggleFind = this.toggleFind.bind(this)
    this.triggerChange = this.triggerChange.bind(this)
    this.triggerKeyUp = this.triggerKeyUp.bind(this)
    this.triggerSearch = this.triggerSearch.bind(this)
    this.moveEnd = this.moveEnd.bind(this)
    this.triggerBack = this.triggerBack.bind(this)

    UiStore.bind('goingBack', this.triggerBack)
  }
  watchPosition() {
    geoID = navigator.geolocation.watchPosition((position) => {
      if (this.state.currentPosition[0] === 0){
        this.setCurrentPosition(position)

        // hardcoded for auckland only
        if (this.state.currentPosition[0] > -38 && this.state.currentPosition[0] < -36
          && this.state.currentPosition[1] > 173 && this.state.currentPosition[1] < 175) {
          this.getAndSetCurrentPosition()
        }
      } else {
        this.setCurrentPosition(position)
      }   
    }, (error) => {
      //will remove for release
      this.setState({
        error: error.message
      })
    }, {
      enableHighAccuracy: true,
      timeout: 5000
    })
  }
  getAndSetCurrentPosition() {
    this.setState({
      position: [this.state.currentPosition[0] + Math.random()/100000, this.state.currentPosition[1] + Math.random()/100000]
    })
  }

  setCurrentPosition(position) {
    //console.log('getting new position')
    //console.log(position.coords.accuracy)
    this.setState({
      currentPosition: [position.coords.latitude, position.coords.longitude],
      accuracy: position.coords.accuracy
    })
  }
  currentLocateButton() {
    if (this.state.error === '') {
      this.getAndSetCurrentPosition()
    } else {
      alert(this.state.error)
    }
  }
  componentDidMount() {
    this.getData(this.state.position[0], this.state.position[1], 250)
    if (window.location.pathname === '/s') {
      this.watchPosition()
    }
  }
  // stops requesting location when not in use
  componentWillReceiveProps() {
    if (window.location.pathname === '/s') {
      this.watchPosition()
    } else {
      requestAnimationFrame(function() {
        navigator.geolocation.clearWatch(geoID)
      })
    }

  }
  componentWillUnmount() {
    // can't do anything about this for now
    // if (typeof(dataRequest) !== 'undefined') {
    //   dataRequest.abort()
    // }
    requestAnimationFrame(function() {
      navigator.geolocation.clearWatch(geoID)
    })
    UiStore.unbind('goingBack', this.triggerBack)
  }
  getData(lat, lng, dist) {
    fetch(`/a/station/search?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&distance=${dist}`).then((response) => {
      response.json().then((data) => {
        this.setState({
          stops: data
        })
      })
    })
  }
  toggleFind() {
    this.setState({
      findModal: !this.state.findModal
    })
    setTimeout(() => {
      if (this.state.findModal === true) {
        ReactDOM.findDOMNode(this.refs.searchInput).focus()
      } else {
        ReactDOM.findDOMNode(this.refs.searchInput).blur()
      }
    }, 200)
  }
  triggerChange(e) {
    this.setState({
      station: e.currentTarget.value
    })
  }
  triggerKeyUp(e) {
    if (e.keyCode === 13) {
      this.triggerSearch(undefined)
    }
  }
  triggerSearch(e) {
    if (e) {
      e.preventDefault()
    }
    ReactDOM.findDOMNode(this.refs.searchInput).blur()
    browserHistory.push(`/s/${this.state.station}`)
  }
  viewServices(station) {
    return function() {
      browserHistory.push(`/s/${station}`)
    }
  }
  moveEnd(e) {
    var zoom = e.target.getZoom()
    // we're basing this off screensize
    var screensize = document.body.offsetWidth
    if (document.body.offsetHeight > screensize) {
      screensize = document.body.offsetHeight
    }
    var dist = Math.ceil(0.2 * screensize)
    if (zoom === 17) {
      dist = Math.ceil(0.35 * screensize)
    } else if (zoom === 16) {
      dist = Math.ceil(0.6 * screensize)
    } else if (zoom < 16) {
      this.setState({
        stops: []
      })
      return 
    }
    // max the api will handle is 1250
    if (dist > 1250) {
      dist = 1250
    }

    var newPos = e.target.getCenter()
    this.getData(newPos.lat, newPos.lng, dist)
  }
  triggerBack() {
    this.setState({
      back: UiStore.getState().goingBack
    })
  }
  render() {

    // this is the key for now
    let retina = ''
    if (window.devicePixelRatio > 1) {
      retina = '@2x'
    }
    var classname = 'searchContainer'
    if (window.location.pathname === '/s') {
      classname += ' activepane'
    }
    if (this.state.back) {
      classname += ' goingback'
    }

    // css class is saveModal
    var findModal = 'saveModal'
    if (!this.state.findModal) {
      findModal += ' hidden'
    }

    var positionMap = {}

    return (
      <div className="search">
        <div className={findModal}>
          <div>
            <h2>Find Stop</h2>
            <input type="tel"
              placeholder="Enter Stop Number"
              maxLength="4"
              value={this.state.station}
              onKeyUp={this.triggerKeyUp}
              onChange={this.triggerChange} 
              ref="searchInput"
            />
            <button className="cancel" onTouchTap={this.toggleFind}>Cancel</button>
            <button className="submit" onTouchTap={this.triggerSearch}>Go</button>
          </div>
        </div>
        <Map
          ref="map"
          onMoveend={this.moveEnd}
          center={this.state.position} 
          zoom={18}
          zoomControl={false}
          className="map">
          <ZoomControl position="bottomleft" />
          <TileLayer
            url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
            attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {this.state.stops.map((stop) => {
            var icon = StationStore.getIcon(stop.stop_id)
            var markericon = busIcon
            if (icon === 'train') {
              markericon = trainIcon
            } else if (icon === 'ferry') {
              markericon = ferryIcon
            }              

            // jono's awesome collison detection
            // basically checks if something is already there
            var lng = stop.stop_lng
            if(typeof(positionMap[stop.stop_lat]) === 'undefined') {
              positionMap[stop.stop_lat] = [lng]
            } else {
              if (positionMap[stop.stop_lat].indexOf(lng) !== -1) {
                lng = lng + 0.0002
              } else {
                positionMap[stop.stop_lat].push(lng)
              }
            }

            return (
              <Marker icon={markericon} key={stop.stop_id} position={[stop.stop_lat, lng]}>
                <Popup>
                  <span>
                    <img src={`/icons/${icon}.svg`} />
                    <h2>{stop.stop_name}</h2>
                    <h3>Stop {stop.stop_id}</h3>
                    <button onClick={this.viewServices(stop.stop_id)}>View Services</button>
                  </span>
                </Popup>
              </Marker>
             )
          })}
          <Circle className="bigCurrentLocationCircle" center={this.state.currentPosition} radius={(this.state.accuracy)}/> 
          <CircleMarker className="smallCurrentLocationCircle" center={this.state.currentPosition} radius={7} /> 
        </Map>
      </div>
    )
  }
}
export default Search