import React from 'react'
import PropTypes from 'prop-types'
import { StyleSheet, TouchableOpacity } from 'react-native'
import leaflet from 'leaflet'
import * as reactLeaflet from 'react-leaflet'

import { withRouter } from 'react-router'

import local from '../../../local'

import { vars } from '../../styles.js'
import CurrentLocation from '../../stores/CurrentLocation.js'
import StationStore from '../../stores/StationStore.js'
import SettingsStore from '../../stores/SettingsStore.js'
import UiStore from '../../stores/UiStore.js'
import { t } from '../../stores/translationStore.js'

import LocateIcon from '../../../dist/icons/locate-2.svg'

import IconHelper from '../../helpers/icons/index.js'

const Icon = leaflet.icon
const { CRS, point, latLng } = leaflet
const LeafletMap = reactLeaflet.Map
const { Marker, TileLayer, ZoomControl, Circle, CircleMarker } = reactLeaflet

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
      iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        dynamic
      )}`,
      iconSize: [25, 41],
    })
  }
}

const calculateSnap = (stop, collisionMap) => {
  const markerWidth = 28
  const markerHeight = 34

  const xSnap = Math.floor(stop.x / markerWidth / 1)
  const ySnap = Math.floor(stop.y / markerHeight / 1)

  // checks itself, plus the 8 positions around it
  const foundColision = [
    (collisionMap[xSnap] || {})[ySnap],
    (collisionMap[xSnap + 1] || {})[ySnap],
    (collisionMap[xSnap + 1] || {})[ySnap + 1],
    (collisionMap[xSnap] || {})[ySnap + 1],
    (collisionMap[xSnap - 1] || {})[ySnap + 1],
    (collisionMap[xSnap - 1] || {})[ySnap],
    (collisionMap[xSnap - 1] || {})[ySnap - 1],
    (collisionMap[xSnap] || {})[ySnap - 1],
    (collisionMap[xSnap + 1] || {})[ySnap - 1],
  ].filter(f => f !== undefined)[0]

  collisionMap[xSnap] = collisionMap[xSnap] || {}
  if (
    collisionMap[xSnap][ySnap] === undefined &&
    collisionMap[xSnap][ySnap] === undefined
  ) {
    collisionMap[xSnap][ySnap] = stop
  }

  if (foundColision !== undefined) {
    const xDelta = foundColision.x - stop.x
    const yDelta = foundColision.y - stop.y

    if (Math.abs(xDelta) > Math.abs(yDelta) || xDelta === yDelta) {
      if (Math.abs(xDelta) < markerWidth) {
        if (xDelta < 0) {
          stop.x = stop.x + xDelta + markerWidth + 1
        } else {
          stop.x = stop.x + xDelta - markerWidth - 1
        }
      }
    } else if (Math.abs(yDelta) < markerHeight) {
      if (yDelta < 0) {
        stop.y = stop.y + yDelta + markerHeight + 1
      } else {
        stop.y = stop.y + yDelta - markerHeight - 1
      }
    }
    const nxSnap = stop.x
    const nySnap = stop.y
    collisionMap[stop.x] = collisionMap[nxSnap] || {}
    if (collisionMap[nxSnap][nySnap] === undefined) {
      collisionMap[nxSnap][nySnap] = stop
    } else {
      // bail out
    }
  }
}

// If we stop binding this to the history, we can make this pure
class BaseMap extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
  }

  map = React.createRef()

  iconHelper = new IconHelper()

  myIcons = {}

  state = {
    stops: [],
    position: SettingsStore.getState().lastLocation,
    positionMarker: [0, 0],
    initialPosition: true,
    loadmap: true,
    hideStops: false,
    online: window.navigator.onLine,
  }

  zoom = 17

  position = [...SettingsStore.getState().lastLocation, getDist(this.zoom)]

  componentDidMount() {
    window.addEventListener('online', this.triggerRetry)
    window.addEventListener('offline', this.goOffline)
    CurrentLocation.bind('pinmove', this.pinmove)
    CurrentLocation.bind('mapmove', this.mapmove)
    CurrentLocation.bind('mapmove-silent', this.mapmovesilent)
    UiStore.bind('stop-visibility', this.stopVisibility)
    this.getData(this.position[0], this.position[1], this.position[2])

    UiStore.basemap = this.map.current.leafletElement

    if (CurrentLocation.state.hasGranted) {
      CurrentLocation.startWatch()
    }
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.triggerRetry)
    window.removeEventListener('offline', this.goOffline)
    CurrentLocation.unbind('pinmove', this.pinmove)
    CurrentLocation.unbind('mapmove', this.mapmove)
    CurrentLocation.unbind('mapmove-silent', this.mapmovesilent)
    UiStore.unbind('stop-visibility', this.stopVisibility)
    CurrentLocation.stopWatch()
  }

  stopVisibility = state => {
    if (this.state.hideStops !== state) {
      this.setState({
        hideStops: state,
      })
      if (state === false && this.zoom > 15) {
        this.getData(this.position[0], this.position[1], this.position[2])
      }
    }
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
    this.zoom = 17
    const position = CurrentLocation.state.position.slice()
    position[0] += 0.00000001
    this.setState({
      position,
      positionMarker: CurrentLocation.state.position.slice(),
      initialPosition: false,
    })
  }

  mapmovesilent = () => {
    this.zoom = 17
    this.setState({
      position: CurrentLocation.state.position.slice(),
      initialPosition: false,
    })
  }

  async getData(lat, lon, dist) {
    const { bikeShare } = SettingsStore.state
    this.position = [lat, lon, dist]
    try {
      const res = await fetch(
        `${local.endpoint}/auto/station/search?lat=${lat.toFixed(
          4
        )}&lon=${lon.toFixed(4)}&distance=${dist}`
      )
      const data = await res.json()
      data.forEach(item => {
        StationStore.stationCache[item.stop_id] = item
        if (typeof this.myIcons[item.route_type.toString()] === 'undefined') {
          this.myIcons[item.route_type.toString()] = this.iconHelper.getIcon(
            StationStore.currentCity.prefix,
            item.route_type
          )
        }
      })
      this.setState({
        stops: data,
      })
    } catch (error) {
      console.log(error)
    }
  }

  triggerCurrentLocation = () => {
    CurrentLocation.currentLocationButton()
  }

  viewServices = (station, region) => () => {
    const { history } = this.props
    const split = history.location.pathname.split('/')
    const currentStation = `/s/${region}/${station}`
    if (split[1] === 's' && split.length === 4) {
      history.replace(currentStation)
    } else {
      history.push(currentStation)
    }
  }

  moveEnd = e => {
    const zoom = e.target.getZoom()
    this.zoom = zoom
    const newPos = e.target.getCenter()

    if (
      this.state.stops.length > 0 &&
      this.state.stops[0].stop_region !== StationStore.currentCity.prefix
    ) {
      StationStore.getCity(newPos.lat, newPos.lng)
    }
    let dist = 0
    if (zoom < 16 || this.state.hideStops) {
      this.setState({
        stops: [],
      })
      return
    }
    dist = getDist(zoom)
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
      this.getData(this.position[0], this.position[1], 250)
    }, 50)
  }

  goOffline = () => {
    this.setState({
      online: false,
    })
  }

  render() {
    const { stops } = this.state
    const collisionMap = {}
    stops.forEach(stop => {
      const point = CRS.EPSG3857.latLngToPoint(
        latLng(stop.stop_lat, stop.stop_lon),
        this.zoom
      )
      stop.x = point.x
      stop.y = point.y
      calculateSnap(stop, collisionMap)
    })
    // changes stuff in place (a bit gross)
    Object.keys(collisionMap).forEach(a => {
      Object.keys(collisionMap[a]).forEach(b => {
        const stop = collisionMap[a][b]
        const coords = CRS.EPSG3857.pointToLatLng(
          point(stop.x, stop.y),
          this.zoom
        )
        stop.stop_lat = coords.lat
        stop.stop_lon = coords.lng
        return b
      })
    })

    let stationMarker = null
    const splitName = window.location.pathname.split('/')
    if (splitName.length === 4 && splitName[1][0] === 's') {
      const currentStation = splitName[3]
      const item = StationStore.stationCache[currentStation]
      if (typeof item !== 'undefined') {
        const icon = this.iconHelper.getRouteType(item.route_type)
        const markericon = this.iconHelper.getIcon(
          StationStore.currentCity.prefix,
          item.route_type,
          'selection'
        )
        stationMarker = (
          <Marker
            alt={t(`station.${icon}`)}
            icon={markericon}
            position={[item.stop_lat, item.stop_lon]}
          />
        )
      }
    }

    const positionMap = {}

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
          maxZoom={17}
          zoom={this.zoom}
          zoomControl={false}
          className="map"
          ref={this.map}
        >
          <ZoomControl position="bottomleft" />
          <TileLayer
            errorTileUrl={'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            url={
              'https://maps-ap-southeast-2.dymajo.com/osm_tiles/{z}/{x}/{y}@2x.png'
            }
            attribution={
              '© <a href="https://openmaptiles.org/">OpenMapTiles</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }
          />
          {this.state.hideStops
            ? null
            : this.state.stops.map(stop => {
                const icon = this.iconHelper.getRouteType(stop.route_type)
                let markericon = this.myIcons[stop.route_type.toString()]
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
                let lng = stop.stop_lon
                if (typeof positionMap[stop.stop_lat] === 'undefined') {
                  positionMap[stop.stop_lat] = [lng]
                } else if (positionMap[stop.stop_lat].indexOf(lng) !== -1) {
                  lng += 0.0002
                } else {
                  positionMap[stop.stop_lat].push(lng)
                }
                return (
                  <Marker
                    alt={t(`station.${icon}`)}
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
          // TODO: Add this back in the refactor
          // className="hide-maximized"
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
export default withRouter(BaseMap)
