import React from 'react'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

let request = require('reqwest')
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

class Line extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      line: undefined,
      route_id: undefined,
      route_list: []
    }
    this.getWKB = this.getWKB.bind(this)
    this.getShapeIDs = this.getShapeIDs.bind(this)
    this.triggerTap = this.triggerTap.bind(this)
  }

  getWKB(shape){
    request(`/a/shape/${shape}`).then((wkb)=>{
      this.convert(wkb)       
    })
  }

  getShapeIDs(line){
    request(`/a/line/${line}`).then((shape)=>{
      var shapes = []
      shape.forEach(function(s){
        shapes.push([s.shape_id, s.route_long_name])
      })
      this.setState({
        route_list: shapes
      })
    })
  }
  convert(data){
    var wkb = new Buffer(data, 'hex')
    this.setState({
      line: wkx.Geometry.parse(wkb).toGeoJSON()
    })
  }

  triggerTap(shape){
    var wkb = this.getWKB
    return function(){
      console.log(shape)
      wkb(shape)
    }
  }
  
  componentDidMount(){
    this.getShapeIDs(this.props.routeParams.line)   
  }

  componentWillReceiveProps(nextProps){
    this.getShapeIDs(nextProps.routeParams.line)
  }

  render(){
    if (typeof(this.state.line) !== 'undefined') {
      console.log('it defined')
      var geoJson = <GeoJson data={this.state.line} />
    }

    return(
    <div>
      {this.state.route_list.map((route)=>{
        return <div key={route[0]}><button onTouchTap={this.triggerTap(route[0])}>{route[1]}</button></div>
      })}
      <Map style={{height: '500px'}}
        center={[-36.840556, 174.74]} 
        zoom={13}>
        <TileLayer
          url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
          attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {geoJson}
      </Map>
      
    </div>
    )
  }
}

export default Line