import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'
import { UiStore } from '../stores/uiStore.ts'

declare function require(name: string): any;
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
const token = '?access_token=pk.eyJ1IjoiY29uc2luZG8iLCJhIjoiY2lza3ozcmd5MDZrejJ6b2M0YmR5dHBqdiJ9.Aeru3ssdT8poPZPdN2eBtg'

interface IAppProps extends React.Props<Line>{
    routeParams: {
        line: string
  }
}

interface IAppState {
    line?: Array<Array<number>>,
    route_id?: String,
    route_list?: Array<Array<String>>
}

class Line extends React.Component<IAppProps, IAppState>{
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

    public getWKB(shape){
            request(`/a/shape/${shape}`).then((wkb)=>{
                this.convert(wkb)           
        })
    }

    public getShapeIDs(line){
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
    public convert(data){
        var wkb = new Buffer(data, 'hex')
        this.setState({
            line: wkx.Geometry.parse(wkb).toGeoJSON()
        })
    }

    public triggerTap(shape){
        var wkb = this.getWKB
        return function(){
            console.log(shape)
            wkb(shape)
        }
    }
    
    public componentDidMount(){
        this.getShapeIDs(this.props.routeParams.line)   
    }

    public componentWillReceiveProps(nextProps){
        this.getShapeIDs(nextProps.routeParams.line)
    }

    public render(){
        if (typeof(this.state.line) !== 'undefined') {
            console.log('it defined')
            var geoJson = <GeoJson data={this.state.line} />
        }
        let retina = ''
        if (window.devicePixelRatio > 1) {
            retina = '@2x'
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
                    url={'https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}' + retina + token}
                    attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {geoJson}
            </Map>
            
        </div>
        )
    }
}

export default Line