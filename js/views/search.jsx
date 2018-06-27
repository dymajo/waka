import React from 'react'
import PropTypes from 'prop-types'
import { StyleSheet } from 'react-native'
import leaflet from 'leaflet'
import * as reactLeaflet from 'react-leaflet'

import { withRouter } from 'react-router'

import local from '../../local'

import { vars } from '../styles.js'
import { CurrentLocation } from '../stores/currentLocation.js'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'
import { TouchableOpacity } from './reusable/touchableOpacity.jsx'

import LocateIcon from '../../dist/icons/locate-2.svg'

import iconhelper from '../helpers/icon.js'

const Icon = leaflet.icon
const LeafletMap = reactLeaflet.Map
const Marker = reactLeaflet.Marker
const TileLayer = reactLeaflet.TileLayer
const ZoomControl = reactLeaflet.ZoomControl
const Circle = reactLeaflet.Circle
const CircleMarker = reactLeaflet.CircleMarker

const IconHelper = new iconhelper()

const getDist = function(zoom) {
  let screensize = document.body.offsetWidth
  if (document.body.offsetHeight > screensize) {
    screensize = document.body.offsetHeight
  }
  let dist = Math.ceil(0.2 * screensize)
  if (zoom === 17) {
    dist = Math.ceil(0.45 * screensize)
  } else if (zoom === 16) {
    dist = Math.ceil(0.8 * screensize)
  }
  // max the api will handle is 1250
  if (dist > 1250) {
    dist = 1250
  }
  return dist
}

const getMarker = function(iconType, name) {
  if (iconType === 'bus') {
    name = name
      .trim()
      .replace(/\)/g, '')
      .replace(/\(/g, '')
    if (name.substring(3, 4) === ' ' || name.length === 3) {
      name = name.substring(0, 3)
    } else if (name.substring(2, 3) === ' ' || name.length === 2) {
      name = name.substring(0, 2)
    } else {
      name = name.substring(0, 1)
    }
    name = name.replace(/ /g, '').toUpperCase()
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
      iconUrl:
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dynamic),
      iconSize: [25, 41],
    })
  }
}

// If we stop binding this to the history, we can make this pure
class Search extends React.Component {
  static propTypes = {
    history: PropTypes.object,
  }
  myIcons = {}
  state = {
    station: '',
    stops: [],
    position: SettingsStore.getState().lastLocation,
    positionMarker: [0, 0],
    initialPosition: true,
    loadmap: true,
    online: window.navigator.onLine,
  }
  componentDidMount() {
    window.addEventListener('online', this.triggerRetry)
    window.addEventListener('offline', this.goOffline)
    CurrentLocation.bind('pinmove', this.pinmove)
    CurrentLocation.bind('mapmove', this.mapmove)
    CurrentLocation.bind('mapmove-silent', this.mapmovesilent)
    this.getData(this.state.position[0], this.state.position[1], getDist(17))

    if (CurrentLocation.state.hasGranted) {
      CurrentLocation.startWatch()
    }
  }
  // stops requesting location when not in use
  componentWillReceiveProps() {
    setTimeout(() => {
      if (window.location.pathname !== '/') {
        CurrentLocation.stopWatch()
      }
    }, 300)
  }
  componentWillUnmount() {
    window.removeEventListener('online', this.triggerRetry)
    window.removeEventListener('offline', this.goOffline)
    CurrentLocation.unbind('pinmove', this.pinmove)
    CurrentLocation.unbind('mapmove', this.mapmove)
    CurrentLocation.unbind('mapmove-silent', this.mapmovesilent)
    CurrentLocation.stopWatch()
  }
  pinmove = () => {
    if (this.state.initialPosition) {
      this.mapmove()
    } else {
      this.setState({
        positionMarker: CurrentLocation.state.position.slice(),
      })
    }
  }
  mapmove = () => {
    this.setState({
      position: CurrentLocation.state.position.slice(),
      positionMarker: CurrentLocation.state.position.slice(),
      initialPosition: false,
    })
  }
  mapmovesilent = () => {
    this.setState({
      position: CurrentLocation.state.position.slice(),
      initialPosition: false,
    })
  }
  getData(lat, lon, dist) {
    const { bikeShare } = SettingsStore.state
    fetch(
      `${local.endpoint}/auto/station/search?lat=${lat.toFixed(
        4
      )}&lon=${lon.toFixed(4)}&distance=${dist}&bikes=${bikeShare}`
    ).then(response => {
      response.json().then(data => {
        data.forEach(item => {
          StationStore.stationCache[item.stop_id] = item
          if (typeof this.myIcons[item.route_type.toString()] === 'undefined') {
            this.myIcons[item.route_type.toString()] = IconHelper.getIcon(
              StationStore.currentCity,
              item.route_type
            )
          }
        })
        this.setState({
          stops: data,
        })
      })
    })
  }
  triggerCurrentLocation = () => {
    CurrentLocation.currentLocationButton()
  }
  viewServices = (station, region = 'nz-akl') => {
    return () => {
      const split = this.props.history.location.pathname.split('/')
      const currentStation = `/s/${region}/${station}`
      if (split[1] === 's' && split.length === 4) {
        this.props.history.replace(currentStation)
      } else {
        this.props.history.push(currentStation)
      }
      this.setState({
        currentStation: currentStation,
      })
    }
  }
  moveEnd = e => {
    const zoom = e.target.getZoom()
    let newPos = e.target.getCenter()

    StationStore.getCity(newPos.lat, newPos.lng)
    let dist = 0
    if (zoom < 16) {
      this.setState({
        stops: [],
      })
      return
    } else {
      dist = getDist(zoom)
    }
    this.getData(newPos.lat, newPos.lng, dist)
  }
  triggerRetry = () => {
    this.setState({
      loadmap: false,
      online: window.navigator.onLine,
    })
    setTimeout(() => {
      this.setState({
        loadmap: true,
      })
      this.getData(this.state.position[0], this.state.position[1], 250)
    }, 50)
  }
  goOffline = () => {
    this.setState({
      online: false,
    })
  }
  render() {
    let stationMarker = null
    const splitName = window.location.pathname.split('/')
    if (splitName.length >= 4 && splitName[1][0] === 's') {
      const currentStation = splitName[3]
      const item = StationStore.stationCache[currentStation]
      if (typeof item !== 'undefined') {
        let icon = IconHelper.getRouteType(item.route_type)
        let markericon = IconHelper.getIcon(
          StationStore.currentCity,
          item.route_type,
          'selection'
        )
        stationMarker = (
          <Marker
            alt={t('station.' + icon)}
            icon={markericon}
            position={[item.stop_lat, item.stop_lon]}
          />
        )
      }
    }

    var positionMap = {}

    let bigCircle
    if (this.state.accuracy < 500) {
      bigCircle = (
        <Circle
          className="bigCurrentLocationCircle"
          center={CurrentLocation.state.position}
          radius={CurrentLocation.state.accuracy}
        />
      )
    }

    let offline = null
    if (!this.state.online) {
      offline = (
        <div className="offline-container">
          <p>You are not connected to the internet.</p>
          <button className="nice-button primary" onClick={this.triggerRetry}>
            Retry
          </button>
        </div>
      )
    }

    let mapview
    if (this.state.loadmap) {
      mapview = (
        <LeafletMap
          onMoveend={this.moveEnd}
          center={this.state.position}
          maxZoom={18}
          zoom={17}
          zoomControl={false}
          className="map"
        >
          <ZoomControl position="bottomleft" />
          <TileLayer
            url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}@2x.png'}
            attribution={
              '© <a href="https://openmaptiles.org/">OpenMapTiles</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }
          />
          {this.state.stops.map(stop => {
            let icon, markericon
            icon = IconHelper.getRouteType(stop.route_type)
            markericon = this.myIcons[stop.route_type.toString()]
            if (icon === 'bus') {
              const stopSplit = stop.stop_name.split('Stop')
              const platformSplit = stop.stop_name.split('Platform')
              if (stopSplit.length > 1) {
                markericon = getMarker('bus', stopSplit[1])
              } else if (platformSplit.length > 1) {
                markericon = getMarker('bus', platformSplit[1])
              }
            }

            // jono's awesome collison detection
            // basically checks if something is already there
            var lng = stop.stop_lon
            if (typeof positionMap[stop.stop_lat] === 'undefined') {
              positionMap[stop.stop_lat] = [lng]
            } else {
              if (positionMap[stop.stop_lat].indexOf(lng) !== -1) {
                lng = lng + 0.0002
              } else {
                positionMap[stop.stop_lat].push(lng)
              }
            }

            return (
              <Marker
                alt={t('station.' + icon)}
                icon={markericon}
                key={stop.stop_id}
                position={[stop.stop_lat, lng]}
                onClick={this.viewServices(stop.stop_id, stop.stop_region)}
              />
            )
          })}
          {bigCircle}
          <CircleMarker
            className="smallCurrentLocationCircle"
            center={this.state.positionMarker}
            radius={7}
          />
          {stationMarker}
        </LeafletMap>
      )
    }

    return (
      <div className="search">
        <TouchableOpacity
          className="hide-maximized"
          activeOpacity={75}
          touchAction="none"
          onClick={this.triggerCurrentLocation}
          style={styles.locate}
        >
          <LocateIcon />
        </TouchableOpacity>
        {mapview}
        {offline}
      </div>
    )
  }
}
const styles = StyleSheet.create({
  locate: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    position: 'absolute',
    zIndex: 10,
    paddingTop: vars.padding * 0.875,
    paddingBottom: vars.padding * 0.875,
    paddingLeft: vars.padding * 0.375,
    paddingRight: vars.padding * 0.375,
    top: vars.padding * 0.75,
    right: vars.padding * 0.75,
    borderRadius: 5,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
})
const SearchWithRouter = withRouter(Search)
export default SearchWithRouter
