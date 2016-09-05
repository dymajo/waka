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
let Icon = require('leaflet').icon

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

// whatever the public can use doesn't really bother me
const token = '?access_token=pk.eyJ1IjoiY29uc2luZG8iLCJhIjoiY2lza3ozcmd5MDZrejJ6b2M0YmR5dHBqdiJ9.Aeru3ssdT8poPZPdN2eBtg'
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
    this.triggerKeyUp = this.triggerKeyUp.bind(this)
    this.triggerSearch = this.triggerSearch.bind(this)
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
  private triggerKeyUp(e) {
    if (e.keyCode === 13) {
      this.triggerSearch(undefined)
    }
  }
  private triggerSearch(e) {
    if (e) {
      e.preventDefault()
    }
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

    return (
      <div className="search">
        <div className="searchbox">
        <form onSubmit={this.triggerSearch}>
          <input type="tel" placeholder="Enter Stop Number" onChange={this.triggerChange} />
          <button type="submit" onClick={this.triggerSearch} onFocus={this.triggerSearch}><img src="icons/search-dark.png" /></button>
        </form>
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
            attribution='© <a href="https://www.mapbox.com/about/maps/"">Mapbox</a> | © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {this.state.stops.map((stop) => {
            var icon = 'bus'
            var markericon = busIcon
            if (StationStore.trainStations.indexOf(stop.stop_id) != -1) {
              icon = 'train'
              markericon = trainIcon
            } else if (StationStore.ferryStations.indexOf(stop.stop_id) != -1) {
              icon = 'ferry'
              markericon = ferryIcon
            }

            return (
              <Marker icon={markericon} key={stop.stop_id} position={[stop.stop_lat, stop.stop_lng]}>
                <Popup>
                  <span>
                    <img src={`/icons/${icon}.svg`} />
                    <h2>{stop.stop_name}</h2>
                    <h3>Stop {stop.stop_id}</h3>
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