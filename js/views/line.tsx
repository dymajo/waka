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
    line: Array<Array<number>>
}

class Line extends React.Component<IAppProps, IAppState>{
    constructor(props) {
        super(props)
        this.state = {
            line: undefined
        }
    }
    public convert(data){
        var wkb = new Buffer(data, 'hex')
        this.setState({
            line: wkx.Geometry.parse(wkb).toGeoJSON()
        })
    }
    
    public componentDidMount(){
        console.log(this.props.routeParams.line)
        request(`/a/line/${this.props.routeParams.line}`).then((shape)=>{
            console.log(shape[0].shape_id)
            request(`/a/shape/${shape[0].shape_id}`).then((wkb)=>{
                //console.log(wkb)
                this.convert(wkb)
            })
        })
       
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
            <Map style={{height: '400px'}}
                center={[-36.844229, 174.767823]} 
                zoom={18}>
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