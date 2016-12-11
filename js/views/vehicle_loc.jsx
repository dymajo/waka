import React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.js'

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

class vehicle_location extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      line: undefined,
      stops: [],
      stop_ids: undefined,
      position: [-36.844229, 174.767823],
      currentPosition: [0,0],
      accuracy: 0,
      error: '',
      tripInfo: {},
      showIcons: true
    }
    this.getData = this.getData.bind(this)
    this.getWKB = this.getWKB.bind(this)
    this.convert = this.convert.bind(this)
    this.setCurrentPosition = this.setCurrentPosition.bind(this)
    this.currentLocateButton = this.currentLocateButton.bind(this)
    this.zoomstart = this.zoomstart.bind(this)
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

  getData(){
    var stops = []
    var stop_ids = []
    fetch(`/a/vehicle_loc/${this.props.params.trip_id}`).then((response) => {
      response.json().then((data) => {
        this.getWKB(data.az.shape_id)
        data.at.forEach(function(item){
          stops.push([item.stop_lat, item.stop_lon, item.stop_id, item.stop_name])
          stop_ids.push(item.stop_id)
        })
        this.setState({
          stops: stops,
          stop_ids: stop_ids
        })
      })
    })
    
  }

  getWKB(shape){
    fetch(`/a/shape/${shape}`).then((response) => {
      response.text().then(this.convert)
    })
  }

  convert(data){
    var wkb = new Buffer(data, 'hex')
    this.setState({
      line: wkx.Geometry.parse(wkb).toGeoJSON()
    })
  }

  componentWillMount() {
    let tripNodeMatches = (item) => {
      return item.trip_id === this.props.params.trip_id
    }
    this.setState({
      tripInfo: this.props.trips.find(tripNodeMatches) || {}
    })
  }
  
  componentDidMount() {
    this.getData()
    this.watchPosition()
  }
  
  currentLocateButton() {
    if (this.state.error === '') {
      this.getAndSetCurrentPosition()
    } else {
      alert(this.state.error)
    }
  }

  componentWillUnmount() {
    requestAnimationFrame(function() {
      navigator.geolocation.clearWatch(geoID)
    })
  }
  triggerBack(){
    let newUrl = window.location.pathname.split('/')
    newUrl.splice(-1)
    browserHistory.push(newUrl.join('/'))
  }

   zoomstart(e){   
    let zoomLevel = e.target.getZoom()
    //console.log(zoomLevel)
    if (zoomLevel < 14) {
      this.setState({
        showIcons: false
      })
    } else {
      this.setState({
        showIcons: true
      })
    }
  }

  render(){
    let geoJson = null
    if (typeof(this.state.line) !== 'undefined') {
      geoJson = <GeoJson color={StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)} className='line' data={this.state.line} />
    }
    return (
      <div className='vehicle-location-container'>
        <header>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <h1 className='line-name'>
              <span style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>{this.state.tripInfo.route_short_name}</span>
              {this.state.tripInfo.route_long_name}
            </h1>
          </div>
        </header>
        <div className='vehicle-location-map'>
          <button className="currentLocationButton" onTouchTap={this.currentLocateButton}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
          </button>
          <Map center={this.state.position} 
            onZoomend={this.zoomstart}
            zoom={16}>
            <TileLayer
              url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
              attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'/>
            {geoJson}
            {Object.keys(this.props.realtime).map((bus) => {
              console.log(bus)
              return (
                <Marker position={[bus.latitude, bus.longitude]} />
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
              return (
                  <CircleMarker color={StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)} className='CircleMarker' key={stop[2]} center={[stop[0], stop[1]]} radius={7} />
                )
            })}
            <Circle className="bigCurrentLocationCircle" center={this.state.currentPosition} radius={(this.state.accuracy)}/> 
            <CircleMarker className="smallCurrentLocationCircle" center={this.state.currentPosition} radius={7} /> 
            
          </Map>
            
        </div>
        <div className='vehicle-location-stops'>
          <h3>Current Station: {JSON.stringify(this.props.realtime)}</h3>
          <ul>
          {this.state.stops.map((stop) => {
            let className = ''
            if (stop[2] === this.props.params.station) {
                className += 'selectedStop'
            }
            return(
              <li className={className}
                key={stop[2]} >{stop[2]} - {stop[3]}
              </li>
            )
          })

          }
          </ul>
        </div>
      </div>
    )
  }
}
export default vehicle_location