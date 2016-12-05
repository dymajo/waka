import * as React from 'react';

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

interface IVehicleLocationProps extends React.Props<App> {}

interface IVehicleLocationState {
    line?: Array<Array<number>>,
    stops?: Array<Array<number>>
}

class vehicle_location extends React.Component<IVehicleLocationProps, {}> {
    constructor(props) {
        super(props)
        this.state = {
            line: undefined,
            stops: []
        }
        this.getData = this.getData.bind(this)
        this.getWKB = this.getWKB.bind(this)
        this.convert = this.convert.bind(this)
    }

    public getData(){
        var stops = []
        request(`/a/vehicle_loc/${this.props.params.trip_id}`).then((data)=>{
            this.getWKB(data.az.shape_id._)
            data.at.forEach(function(item){
                stops.push([item.stop_lat, item.stop_lon])
            })
            this.setState({stops: stops})
        })
        
    }

    public getWKB(shape){
            request(`/a/shape/${shape}`).then((wkb)=>{
                this.convert(wkb)           
        })
    }

    public convert(data){
        var wkb = new Buffer(data, 'hex')
        this.setState({
            line: wkx.Geometry.parse(wkb).toGeoJSON()
        })
    }
    
    public componentDidMount() {
        this.getData()
    }

    public render(){
        let geoJson
        if (typeof(this.state.line) !== 'undefined') {
            console.log('it defined')
            geoJson = <GeoJson data={this.state.line} />
        }
        return (
            <div className='vehicle-location-container'>
                <Map style={{height: '100vh'}}
                    center={[-36.840556, 174.74]} 
                    zoom={13}>
                    <TileLayer
                        url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
                        attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'/>
                    {geoJson}
                    {this.state.stops.map((stop, key) => {
                        return (
                            <Marker key={key} position={stop} />

                        )
                    })}
                </Map>
                     
            </div>
        )
    }
}
            
export default vehicle_location;