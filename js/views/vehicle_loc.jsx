import React from 'react'
import local from '../../local'
import { withRouter } from 'react-router-dom'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'

let leaflet = require('react-leaflet')
let wkx = require('wkx')
let Buffer = require('buffer').Buffer
let Map = leaflet.Map
let Marker = leaflet.Marker
let Popup = leaflet.Popup
let TileLayer = leaflet.TileLayer
let ZoomControl = leaflet.ZoomControl
let GeoJson = leaflet.GeoJSON
let Icon = require('leaflet').icon
let Circle = leaflet.Circle
let CircleMarker = leaflet.CircleMarker
let CurrentStop = window.location.pathname.slice(3,7)
let geoID = undefined
let liveRefresh = undefined

const hiddenIcon = Icon({
  iconUrl: '/icons/bus-fill.svg',
  iconSize: [48, 48],
  className: 'hiddenIcon'
})
const busIcon = Icon({
  iconUrl: '/icons/bus-fill.svg',
  iconRetinaUrl: '/icons/bus-fill.svg',
  iconSize: [24, 24],
  className: 'vehIcon'
})
const trainIcon = Icon({
  iconUrl: '/icons/train-fill.svg',
  iconRetinaUrl: '/icons/train-fill.svg',
  iconSize: [24, 24],
  className: 'vehIcon'
})
const ferryIcon = Icon({
  iconUrl: '/icons/ferry-fill.svg',
  iconRetinaUrl: '/icons/ferry-fill.svg',
  iconSize: [24, 24],
  className: 'vehIcon'
})

class vehicle_location extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      line: undefined,
      stops: [],
      stop_ids: undefined,
      position: this.props.stopInfo,
      currentPosition: [0,0],
      accuracy: 0,
      error: '',
      showIcons: true,
      busPosition: []
    }
    this.getShapeData = this.getShapeData.bind(this)
    this.getPositionData = this.getPositionData.bind(this)
    this.getWKB = this.getWKB.bind(this)
    this.convert = this.convert.bind(this)
    this.zoomstart = this.zoomstart.bind(this)
    this.viewTimetable = this.viewTimetable.bind(this)
  }
  geoID = undefined
  watchPosition = () => {
    this.geoID = navigator.geolocation.watchPosition((position) => {
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

  getAndSetCurrentPosition = () => {
    this.setState({
      position: [this.state.currentPosition[0] + Math.random()/100000, this.state.currentPosition[1] + Math.random()/100000]
    })
  }

  setCurrentPosition = (position) => {
    let pos = [position.coords.latitude, position.coords.longitude]
    this.setState({
      currentPosition: pos,
      accuracy: position.coords.accuracy
    })
    requestAnimationFrame(() => {
      SettingsStore.state.lastLocation = pos
      SettingsStore.saveState()
    })
  }

  currentLocateButton = () => {
    if (this.state.error === '') {
      this.getAndSetCurrentPosition()
    } else {
      if (this.state.error.toLowerCase() === 'timeout expired') {
        // look like something happens
        this.getAndSetCurrentPosition()
        // then update it
        navigator.geolocation.getCurrentPosition((position) => {
          console.log(position, 'wrong')
          this.setCurrentPosition(position)
          this.getAndSetCurrentPosition()
        })
      } else {
        alert(this.state.error)
      }
    }
  } 

  getShapeData(newProps = this.props) {
    let showIcons = true
    let url = `${local.endpoint}/nz-akl/stops/trip/${newProps.params.trip_id}`
    if ('line_id' in newProps.params) {
      if (typeof(newProps.tripInfo.shape_id) !== 'undefined') {
        url = `${local.endpoint}/nz-akl/stops/shape/${newProps.tripInfo.shape_id}`
      } else {
        return
      }
    }
    var stops = []
    var stop_ids = []
    fetch(url).then((response) => {
      response.json().then((data) => {
        data.forEach(function(item){
          stops.push([item.stop_lat, item.stop_lon, item.stop_id, item.stop_name])
          stop_ids.push(item.stop_id)
        })
        if (this.props.tripInfo.route_type === 3 && 'line_id' in newProps.params) {
          showIcons = false
        }
        let newState = {
          stops: stops,
          stop_ids: stop_ids,
          showIcons: showIcons
        }
        // we're going to center the map at the center stop
        this.setState(newState)
      })
    })
  }

  getWKB(newProps = this.props, force = false){
    if (typeof(this.state.line) === 'undefined' || force === true) {
      if (typeof(newProps.tripInfo.shape_id) !== 'undefined') {
        fetch(`${local.endpoint}/nz-akl/shape/${newProps.tripInfo.shape_id}`).then((response) => {
          response.text().then(this.convert)
        })
      }
    }
  }

  componentWillReceiveProps(newProps) {
    if ('line_id' in newProps.params) { 
      if (typeof(newProps.tripInfo.shape_id) !== 'undefined' && newProps.tripInfo.shape_id !== this.props.tripInfo.shape_id) {
        this.setState({line: undefined})  
        this.getWKB(newProps, true)
        this.getShapeData(newProps)
        this.watchPosition()
      }
    } else {
      this.getWKB(newProps)
      navigator.geolocation.clearWatch(this.geoID)
    }
  }

  convert(data){
    let wkb = new Buffer(data, 'hex')
    let geoJson = wkx.Geometry.parse(wkb).toGeoJSON()

    let newState = {
      line: geoJson
    }
    // this centers the line if we're looking at the line
    if ('line_id' in this.props.params) {
      // it's opposite for some reason, also we shouldn't mutate it
      let center = geoJson.coordinates[Math.round(geoJson.coordinates.length/2)]
      newState.position = center.slice().reverse()
    }
    this.setState(newState)
  }
  
  componentDidMount() {
    this.watchPosition()
    this.getWKB()
    this.getShapeData()
    this.getPositionData(this.props)
    liveRefresh = setInterval(() => {
      this.getPositionData(this.props)  
    }, 10000)
    // if ('permissions' in navigator) {
    //   navigator.permissions.query({name:'geolocation'}).then(e => {
    //     if (e.state === 'granted') {
    //       console.log('we are logging your position')
    //       this.watchPosition()
    //     }
    //   })
    // }    
  }
  
  componentWillUnmount() {
    clearInterval(liveRefresh)
    requestAnimationFrame(function() {
      navigator.geolocation.clearWatch(geoID)
    })
  }

  zoomstart(e){   
    let zoomLevel = e.target.getZoom()
    let station = 'notbus'
    if ('line_id' in this.props.params) {
      if (this.props.lineInfo[0].route_type === 3) {
        station = 'bus'
      }
    } else {
      station = StationStore.getIcon(this.props.params.station)
    }
    if (zoomLevel < 14 && station === 'bus') {
      this.setState({
        showIcons: false
      })
    } else {
      this.setState({
        showIcons: true
      })
    }
  }

  getPositionData() {
    // i might bring this back from the dead one day
    if ('line_id' in this.props.params) {
      return
    }
    var trips = Object.keys(this.props.realtime)
    if (trips.length > 0){
      var tripsHashTable = {}
      this.props.trips.forEach(function(trip){
        tripsHashTable[trip.trip_id] = trip.route_long_name
      })
      var queryString = trips.filter((trip) => {
        return tripsHashTable[trip] === this.props.tripInfo.route_long_name
      })
      var requestData
      requestData = JSON.stringify({trips: queryString})
      //console.log(requestData)
      if (queryString.length === 0) {
        return
      }
      let busPositions = {}
      fetch(`${local.endpoint}/nz-akl/vehicle_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestData
      }).then((response) => {
        response.json().then((data) => {
          for (var trip in data) {
            if (typeof(data[trip].latitude) !== 'undefined'){
              busPositions[trip] = {
                latitude: data[trip].latitude,
                longitude: data[trip].longitude,
                bearing: data[trip].bearing
              }
            }
          }
          this.setState({
            busPosition: []
          })
          this.setState({
            busPosition: busPositions
          })
        })
      })
    }
  }
  viewServices = (stop) => {
    return () => {
      this.props.history.push(`/s/nz-akl/${stop}`)
    }
  }
  viewTimetable = (stop) => {
    return () => {
      const line_id = this.props.params.line_id || this.props.tripInfo.route_short_name
      this.props.history.push(`/s/nz-akl/${stop}/timetable/${line_id}-2`)
    }
  }

  render(){
    let color = '#000000'
    let geoJson = null
    if (typeof(this.state.line) !== 'undefined') {
      color = StationStore.getColor(this.props.tripInfo.agency_id, this.props.tripInfo.route_short_name)
      //console.log(color)
      geoJson = <GeoJson className='line' data={this.state.line} style={{color: color}}/>
    }

    let icon = StationStore.getIcon(this.props.params.station)
    if (typeof(this.state.stops[0]) !== 'undefined') {
      icon = StationStore.getIcon(this.state.stops[0][2])
    }
    let leafletIcon = busIcon
    if (icon === 'train') {
      leafletIcon = trainIcon
    } else if (icon === 'ferry') {
      leafletIcon = ferryIcon
    }
    let zoom  = 15
    if ('line_id' in this.props.params) {
      zoom = 12
    }

    return (
      <div>
        <div className='vehicle-location-map'>
        <button className="routeButton" onTouchTap={this.currentLocateButton} alt="Locate Me">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
        </button>
          <Map center={this.state.position} 
            onZoomend={this.zoomstart}
            maxZoom={18}
            zoom={zoom}>
            <TileLayer
              url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
              attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'/>
            {geoJson}
            {Object.keys(this.state.busPosition).map((bus) => {
              return(
                <Marker icon={leafletIcon} key={bus} position={[this.state.busPosition[bus].latitude,this.state.busPosition[bus].longitude]}/>
              )
              
            })}
            {this.state.stops.map((stop, key) => {
              if (geoJson === null) {
                return
              }
              if (!this.state.showIcons) {
                if (key !== 0 && key !== this.state.stops.length - 1){
                  return
                }
              }
              return ([(
                <CircleMarker className='CircleMarker' key={stop[2]} center={[stop[0], stop[1]]} radius={7} color={color} />
              ),
                (
                  <Marker icon={hiddenIcon} key={stop[2]+'invis'} position={[stop[0], stop[1]]}>
                    <Popup>
                      <span>
                        <img src={`/icons/${icon}.svg`} />
                        <h2>{stop[3]}</h2>
                        <h3>Stop {stop[2]}</h3>
                        <button onClick={this.viewServices(stop[2])}>View Services</button>
                        <button className="timetable-button" onClick={this.viewTimetable(stop[2])}>Timetable</button>
                      </span>
                    </Popup>
                  </Marker>
                )
              ])
            })}
            <Circle className="bigCurrentLocationCircle" center={this.state.currentPosition} radius={(this.state.accuracy)}/> 
            <CircleMarker className="smallCurrentLocationCircle" center={this.state.currentPosition} radius={7} /> 
            
          </Map>            
        </div>
      </div>
    )
  }
}
const VehicleLocationWithHistory = withRouter(vehicle_location)
export default VehicleLocationWithHistory