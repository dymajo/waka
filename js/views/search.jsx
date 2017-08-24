import React from 'react'
import PropTypes from 'prop-types'
import leaflet from 'leaflet'
import * as reactLeaflet from 'react-leaflet'

import { withRouter } from 'react-router'

import local from '../../local'

import { CurrentLocation } from '../stores/currentLocation.js'

import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'
import { UiStore } from '../stores/uiStore.js'

const Icon = leaflet.icon
const LeafletMap = reactLeaflet.Map
const Marker = reactLeaflet.Marker
const TileLayer = reactLeaflet.TileLayer
const ZoomControl = reactLeaflet.ZoomControl
const Circle = reactLeaflet.Circle
const CircleMarker = reactLeaflet.CircleMarker

const getMarker = function(iconType, name) { 
  if (iconType === 'bus') {
    name = name.trim().substring(0, 3).replace(/ /g, '').toUpperCase()
    const dynamic = `
    <svg width="25" height="31" viewBox="0 0 25 31" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="Canvas" transform="translate(-634 -926)">
    <g id="Group">
    <g id="Rectangle 8">
    <use xlink:href="#path0_fill" transform="translate(634 926)" fill="#3498DB"/>
    </g>
    <g id="Polygon">
    <use xlink:href="#path1_fill" transform="matrix(1 0 0 -1 641.737 957)" fill="#3498DB"/>
    </g>
    <g id="GG">
      <use xlink:href="#text" transform="translate(634 926)" fill="#fff"/>
    </g>
    </g>
    </g>
    <defs>
    <text id="text" text-anchor="middle" x="12.5" y="19" font-family="sans-serif" font-size="15" font-weight="700">
    ${name}
    </text>
    <path id="path0_fill" d="M 0 2C 0 0.89543 0.89543 0 2 0L 23 0C 24.1046 0 25 0.89543 25 2L 25 23C 25 24.1046 24.1046 25 23 25L 2 25C 0.89543 25 0 24.1046 0 23L 0 2Z"/>
    <path id="path1_fill" d="M 4.76314 0L 9.52628 6L -3.91703e-09 6L 4.76314 0Z"/>
    </defs>
    </svg>
    `
    return Icon({
      iconUrl: 'data:image/svg+xml;charset=utf-8,'+dynamic,
      iconSize: [25, 41]
    })
  }
}

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

const busSelection = Icon({
  iconUrl: '/icons/bus-fill.svg',
  iconRetinaUrl: '/icons/bus-fill.svg',
  iconSize: [24, 24],
  className: 'currentSelectionIcon'
})

const trainSelection = Icon({
  iconUrl: '/icons/train-fill.svg',
  iconRetinaUrl: '/icons/train-fill.svg',
  iconSize: [28, 28],
  className: 'currentSelectionIcon larger'
})

const ferrySelection = Icon({
  iconUrl: '/icons/ferry-fill.svg',
  iconRetinaUrl: '/icons/ferry-fill.svg',
  iconSize: [28, 28],
  className: 'currentSelectionIcon larger'
})

class Search extends React.Component {
  static propTypes = {
    history: PropTypes.object,
  }
  state = {
    station: '',
    stops: [],
    position: SettingsStore.getState().lastLocation,
    positionMarker: [0,0],
    initialPosition: true,
    currentStation: null,
    findModal: false,
    showIcons: true,
  }
  componentDidMount() {
    CurrentLocation.bind('pinmove', this.pinmove)
    CurrentLocation.bind('mapmove', this.mapmove)
    this.getData(this.state.position[0], this.state.position[1], 250)

    
    if (CurrentLocation.state.hasGranted) {
      CurrentLocation.startWatch()
    }
  }
  // stops requesting location when not in use
  componentWillReceiveProps() {
    if (window.location.pathname === '/') {
      CurrentLocation.startWatch()
      this.setState({
        showIcons: true,
        currentStation: null
      })
    } else {
      this.setState({
        showIcons: false
      })
      CurrentLocation.stopWatch()
    }
  }
  componentWillUnmount() {
    CurrentLocation.unbind('pinmove', this.pinmove)
    CurrentLocation.unbind('mapmove', this.mapmove)
    CurrentLocation.stopWatch()
  }
  pinmove = () => {
    if (this.state.initialPosition) {
      this.mapmove()
    } else {
      this.setState({
        positionMarker: CurrentLocation.state.position.slice()
      })
    }

  }
  mapmove = () => {
    console.log(this.state.position, CurrentLocation.state.position)
    this.setState({
      position: CurrentLocation.state.position.slice(),
      positionMarker: CurrentLocation.state.position.slice(),
      initialPosition: false
    })
  }
  getData(lat, lng, dist) {
    fetch(`${local.endpoint}/nz-akl/station/search?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&distance=${dist}`).then((response) => {
      response.json().then((data) => {
        data.forEach(function(item) {
          StationStore.stationCache[item.stop_id] = item
        })
        this.setState({
          stops: data
        })
      })
    })
  }
  toggleFind = () => {
    this.setState({
      findModal: !this.state.findModal
    })
    setTimeout(() => {
      if (this.state.findModal === true) {
        this.searchInput.focus()
      } else {
        this.searchInput.blur()
      }
    }, 200)
  }
  triggerChange = (e) => {
    this.setState({
      station: e.currentTarget.value
    })
  }
  triggerKeyUp = (e) => {
    if (e.keyCode === 13) {
      this.triggerSearch(undefined)
    }
  }
  triggerSearch = (e) => {
    if (e) {
      e.preventDefault()
    }
    this.searchInput.blur()
    this.props.history.push(`/s/nz-akl/${this.state.station}`)
  }
  triggerCurrentLocation = () => {
    CurrentLocation.currentLocationButton()
  }
  viewServices = (station) => {
    return () => {
      this.setState({
        currentStation: station
      })
      UiStore.state.fancyMode = true
      this.props.history.push(`/s/nz-akl/${station}`)
      setTimeout(() => {
        UiStore.state.fancyMode = false
      }, 500) // extra delay to help events to bubble
    }
  }
  moveEnd = (e) => {
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
  render() {
    let stationMarker = null
    if (this.state.currentStation) {
      const item = StationStore.stationCache[this.state.currentStation]
      const icon = StationStore.getIcon(item.stop_id)
      let markericon = busSelection
      if (icon === 'train') {
        markericon = trainSelection
      } else if (icon === 'ferry') {
        markericon = ferrySelection
      }            
      stationMarker = <Marker icon={markericon} position={[item.stop_lat, item.stop_lng]} /> 
    }

    let findModal = 'modal-wrapper'
    if (this.state.findModal === true) {
      findModal += ' show'
    }

    var positionMap = {}

    let bigCircle
    if (this.state.accuracy < 500) {
      bigCircle = <Circle className="bigCurrentLocationCircle" center={CurrentLocation.state.position} radius={(CurrentLocation.state.accuracy)}/> 
    }

    const searchClass = 'search' + (this.state.showIcons ? '' : ' hide-icons')
    return (
      <div className={searchClass}>
        <div className={findModal}>
          <div className="modal">
            <h2>Find Stop</h2>
            <div className="inner">
              <input type="tel"
                placeholder="Enter Stop Number"
                maxLength="4"
                value={this.state.station}
                onKeyUp={this.triggerKeyUp}
                onChange={this.triggerChange} 
                ref={e => this.searchInput = e}
              />
            </div>
            <button className="cancel" onTouchTap={this.toggleFind}>Cancel</button>
            <button className="submit" onTouchTap={this.triggerSearch}>Go</button>
          </div>
        </div>
        <button className="circle-button blue-button bottom-button" onTouchTap={this.toggleFind} alt="Find Stop" title="Find Stop">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </button>
        <button className="circle-button top-button" onTouchTap={this.triggerCurrentLocation} alt="Locate Me">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
        </button>
        <LeafletMap
          onMoveend={this.moveEnd}
          center={this.state.position} 
          maxZoom={18}
          zoom={18}
          zoomControl={false}
          className="map">
          <ZoomControl position="bottomleft" />
          <TileLayer
            url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
            attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {this.state.stops.map((stop) => {
            const icon = StationStore.getIcon(stop.stop_id)
            let markericon
            if (icon === 'train') {
              markericon = trainIcon
            } else if (icon === 'ferry') {
              markericon = ferryIcon
            } else {
              const stopSplit = stop.stop_name.split('Stop')
              const platformSplit = stop.stop_name.split('Platform')
              if (stopSplit.length > 1) {
                markericon = getMarker('bus', stopSplit[1])
              } else if (platformSplit.length > 1) {
                markericon = getMarker('bus', platformSplit[1])
              } else {
                markericon = busIcon
              }
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
              <Marker icon={markericon} key={stop.stop_id} position={[stop.stop_lat, lng]} onClick={this.viewServices(stop.stop_id)} />
            )
          })}
          {bigCircle}
          <CircleMarker className="smallCurrentLocationCircle" center={this.state.positionMarker} radius={7} /> 
          {stationMarker}
        </LeafletMap>
      </div>
    )
  }
}
const SearchWithRouter = withRouter(Search)
export default SearchWithRouter