import * as React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'

declare function require(name: string): any;
let leaflet = require('react-leaflet')
let Map = leaflet.Map
let Marker = leaflet.Marker
let Popup = leaflet.Popup
let TileLayer = leaflet.TileLayer
let ZoomControl = leaflet.ZoomControl

console.log(leaflet)

interface IAppProps extends React.Props<Search> {}

interface IAppState {
  station: string
}

class Search extends React.Component<IAppProps, IAppState> {
  constructor(props) {
    super(props)
    this.state = {
      station: ''
    }

    this.triggerChange = this.triggerChange.bind(this)
    this.triggerClick = this.triggerClick.bind(this)
  }
  private triggerChange(e) {
    this.setState({
      station: e.currentTarget.value
    })
  }
  private triggerClick() {
    //StationStore.addStop(this.state.station)]
    browserHistory.push(`/s/${this.state.station}`)
  }
  public render() {
    const position = [-36.844229, 174.767823];

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
          center={position} 
          zoom={18}
          minZoom={12}
          zoomControl={false}
          className="map">
          <ZoomControl position="bottomleft" />
          <TileLayer
            url={'https://api.mapbox.com/styles/v1/consindo/ciskz7tgd00042xukymayd97g/tiles/256/{z}/{x}/{y}' + retina + token}
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={position}>
            <Popup>
              <span>This is Britomart I think</span>
            </Popup>
          </Marker>
        </Map>
      </div>
    )
  }
}
export default Search