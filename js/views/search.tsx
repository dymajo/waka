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
interface AutocompleteItem {
  name: string,
  id: string
}

interface IAppProps extends React.Props<Search> {}

interface IAppState {
  station: string,
  stops: Array<StopItem>,
  position: Array<number>,
  autocomplete: Array<AutocompleteItem>
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
      position: [-36.844229, 174.767823],
      autocomplete: []
    }

    this.triggerChange = this.triggerChange.bind(this)
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
        position: this.state.position,
        autocomplete: this.state.autocomplete
      })
    })
  }
  private triggerChange(e) {
    this.setState({
      station: e.currentTarget.value,
      stops: this.state.stops,
      position: this.state.position,
      autocomplete: this.state.autocomplete
    })

    // trigger a search woo
    this.triggerSearch()
  }
  private triggerSearch() {
    //StationStore.addStop(this.state.station)]
    let mode = 'mapbox.places'
    let query = this.state.station
    let proximity = this.state.position[1] + ',' + this.state.position[0] 
    /*
    request(`https://api.mapbox.com/geocoding/v5/${mode}/${query}.json${token}&country=nz&proximity=${proximity}`).then((data) => {
      var newArray = []
      console.log(data)
      data.features.forEach(function(item) {
        newArray.push({
          name: item.text,
          id: item.id
        })
      })
      this.setState({
        station: this.state.station,
        stops: this.state.stops,
        position: this.state.position,
        autocomplete: newArray
      })

    })
    */
    //browserHistory.push(`/s/${this.state.station}`)
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
        position: this.state.position,
        autocomplete: this.state.autocomplete
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
          <input type="text" placeholder="Search for a Station" list="search-autocomplete" onChange={this.triggerChange} />
          <datalist id="search-autocomplete">
            {this.state.autocomplete.map(function(item) {
              return <option key={item.id} value={item.name} />
            })}
          </datalist>
          <button onClick={this.triggerSearch}>🔍</button>
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