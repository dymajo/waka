import * as React from 'react'
import { Link, browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'

declare function require(name: string): any;
let request = require('reqwest')
let leaflet = require('react-leaflet')
let Map = leaflet.Map
let Marker = leaflet.Marker
let Popup = leaflet.Popup
let TileLayer = leaflet.TileLayer
let ZoomControl = leaflet.ZoomControl

interface StopItem {
  stop_id: string,
  stop_name: string,
  stop_lat: number,
  stop_lng: number,
  location_type: number
}

interface IAppProps extends React.Props<Search> {}

interface IAppState {
  station: string,
  stops: Array<StopItem>,
  position: Array<number>
}

let dataRequest = undefined

class Search extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      station: '',
      stops: [],
      position: [-36.844229, 174.767823]
    }

    this.triggerChange = this.triggerChange.bind(this)
    this.triggerClick = this.triggerClick.bind(this)
    this.moveEnd = this.moveEnd.bind(this)
  }
  // hack to get it to work with typescript
  public refs: {
    [string: string]: any;
    map: any;
  }
  public componentDidMount() {
    this.getData(this.state.position[0], this.state.position[1], 250)
  }
  private getData(lat, lng, dist) {
    dataRequest = request(`/a/station/search?lat=${lat}&lng=${lng}&distance=${dist}`).then((data) => {
      this.setState({
        station: this.state.station,
        stops: data,
        position: this.state.position
      })
    })
  }
  private triggerChange(e) {
    this.setState({
      station: e.currentTarget.value,
      stops: this.state.stops,
      position: this.state.position
    })
  }
  private triggerClick() {
    //StationStore.addStop(this.state.station)]
    browserHistory.push(`/s/${this.state.station}`)
  }
  public viewServices(station) {
    return function() {
      browserHistory.push(`/s/${station}`)
    }
  }
  public moveEnd(e) {
    var zoom = e.target.getZoom()
    var dist = 250
    if (zoom === 17) {
      dist = 500
    } else if (zoom === 16) {
      dist = 1000
    } else if (zoom < 16) {
      this.setState({
        station: this.state.station,
        stops: [],
        position: this.state.position
      })
      return 
    }

    var newPos = e.target.getCenter()
    this.getData(newPos.lat, newPos.lng, dist)
  }
  public componentWillUnmount() {
    if (typeof(dataRequest) !== 'undefined') {
      dataRequest.abort()
    }
  }
  public render() {

    // this is the public key for now
    let retina
    if (window.devicePixelRatio > 1) {
      retina = '@2x'
    }
    const token = '?access_token=pk.eyJ1IjoiY29uc2luZG8iLCJhIjoiY2lza3ozcmd5MDZrejJ6b2M0YmR5dHBqdiJ9.Aeru3ssdT8poPZPdN2eBtg'

    return (
      <div className="search">
        <div className="searchbox">
          <input type="text" placeholder="Search for a Station" onChange={this.triggerChange} />
          <button onClick={this.triggerClick}>🔍</button>
        </div>
        <Map
          ref="map"
          onMoveend={this.moveEnd}
          center={this.state.position} 
          zoom={18}
          minZoom={12}
          zoomControl={false}
          className="map">
          <ZoomControl position="bottomleft" />
          <TileLayer
            url={'https://api.mapbox.com/styles/v1/consindo/ciskz7tgd00042xukymayd97g/tiles/256/{z}/{x}/{y}' + retina + token}
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
          {this.state.stops.map((stop) => {
            return (
              <Marker key={stop.stop_id} position={[stop.stop_lat, stop.stop_lng]}>
                <Popup>
                  <span>
                    {stop.stop_name} / Stop {stop.stop_id}<br />
                    <button onClick={this.viewServices(stop.stop_id)}>View Services</button>
                  </span>
                </Popup>
              </Marker>
            )
          })}
          
        </Map>
      </div>
    )
  }
}
export default Search