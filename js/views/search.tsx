import * as React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.ts'

declare function require(name: string): any;
let leaflet = require('react-leaflet')
let Map = leaflet.Map
let Marker = leaflet.Marker
let Popup = leaflet.Popup
let TileLayer = leaflet.TileLayer

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

    return (
      <div>Add station using this input thing<br />
        <input type="text" placeholder="station number" onChange={this.triggerChange} />
        <button onClick={this.triggerClick}>search</button>
        <Map center={position} zoom={17} touchZoom={true} className="map">
          <TileLayer
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
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