import * as React from 'react';
import { StationStore } from '../stores/stationStore.ts'

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
let CurrentStop = window.location.pathname.slice(3,7)
let geoID = undefined

interface IVehicleLocationProps extends React.Props<vehicle_location> {
    params: {
        trip_id: string,
        station: string
    },
    agency_id: string,
    code: string
}

interface IVehicleLocationState {
    line?: Array<Array<number>>,
    stops?: Array<Array<string>>,
    stop_ids?: Array<string>,
    position?: Array<number>,
    currentPosition?: Array<number>,
    accuracy?: number
}

class vehicle_location extends React.Component<IVehicleLocationProps, IVehicleLocationState> {
    constructor(props) {
        super(props)
        this.state = {
            line: undefined,
            stops: [],
            stop_ids: undefined,
            position: [-36.844229, 174.767823],
            currentPosition: [0,0],
            accuracy: 0
        }
        this.getData = this.getData.bind(this)
        this.getWKB = this.getWKB.bind(this)
        this.convert = this.convert.bind(this)
        this.setCurrentPosition = this.setCurrentPosition.bind(this)
    }

    public watchPosition() {
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
        } as IVehicleLocationState)
        }, {
        enableHighAccuracy: true,
        timeout: 5000
        })
    }


    public getAndSetCurrentPosition() {
        this.setState({
        position: [this.state.currentPosition[0] + Math.random()/100000, this.state.currentPosition[1] + Math.random()/100000]
        } as IVehicleLocationState)
    }
    public setCurrentPosition(position) {
        //console.log('getting new position')
        //console.log(position.coords.accuracy)
        this.setState({
            currentPosition: [position.coords.latitude, position.coords.longitude],
            accuracy: position.coords.accuracy
        } as IVehicleLocationState)
    }

    public getData(){
        var stops = []
        var stop_ids = []
        request(`/a/vehicle_loc/${this.props.params.trip_id}`).then((data)=>{
            this.getWKB(data.az.shape_id._)
            data.at.forEach(function(item){
                stops.push([item.stop_lat, item.stop_lon, item.stop_id, item.stop_name])
                stop_ids.push(item.stop_id)
            })
            this.setState({stops: stops, stop_ids: stop_ids})
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
        this.watchPosition()
    }
    
    public componentWillUnmount() {
        requestAnimationFrame(function() {
            navigator.geolocation.clearWatch(geoID)
        })
    }

    public render(){
        let geoJson
        if (typeof(this.state.line) !== 'undefined') {
            console.log('it defined')
            geoJson = <GeoJson data={this.state.line} />
        }
        return (
            <div className='vehicle-location-container'>
                <div className='vehicle-location-map'>
                    <Map style={{height: '50vh'}}
                        center={this.state.position} 
                        zoom={13}>
                        <TileLayer
                            url={'https://maps.dymajo.com/osm_tiles/{z}/{x}/{y}.png'}
                            attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'/>
                        {geoJson}
                        {this.state.stops.map((stop, key) => {
                            return (
                                <Marker key={key} position={[stop[0], stop[1]]} />

                            )
                        })}
                        <Circle className="bigCurrentLocationCircle" center={this.state.currentPosition} radius={(this.state.accuracy)}/> 
                        <CircleMarker className="smallCurrentLocationCircle" center={this.state.currentPosition} radius={7} /> 
                    </Map>
                        
                </div>
                <div className='vehicle-location-stops'>
                    <h3>Current Station: {this.props.params.station}</h3>
                    {this.state.stops.map((stop, key) => {
                        return(
                            <div>
                                <ul style={{backgroundColor: StationStore.getColor('AM', '')}} key={key}>{stop[2]} - {stop[3]}</ul>
                            </div>
                        )
                    })

                    }
                </div>
            </div>
        )
    }
}
            
export default vehicle_location;