import React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.js'

class VehicleLocationBootstrap extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showContent: false,
      tripInfo: {}
    }
  }
  componentWillMount() {
    let tripNodeMatches = (item) => {
      return item.trip_id === this.props.params.trip_id
    }
    this.setState({
      tripInfo: this.props.trips.find(tripNodeMatches) || {}
    })
  }
  componentDidMount() {
    require.ensure(['react-leaflet'], () => {
      this.VehicleLocation = require('./vehicle_loc.jsx').default
      this.setState({
        showContent: true
      })
    })
  }
  componentWillReceiveProps(newProps) {
    let tripNodeMatches = (item) => {
      return item.trip_id === newProps.params.trip_id
    }
    this.setState({
      tripInfo: newProps.trips.find(tripNodeMatches) || {}
    })
  }
  triggerBack(){
    let newUrl = window.location.pathname.split('/')
    newUrl.splice(-1)
    browserHistory.push(newUrl.join('/'))
  }
  render() {
    let content = null
    if (this.state.showContent === true) {
      console.log(this.props.stopInfo)
      content = (
        <this.VehicleLocation 
          realtime={this.props.realtime}
          params={this.props.params}
          trips={this.props.trips}
          tripInfo={this.state.tripInfo}
          stopInfo={this.props.stopInfo}
        />
      )
    }
    return (
      <div className='vehicle-location-container'>
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <h1 className='line-name'>
              <span style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>
                {this.state.tripInfo.route_short_name}
              </span>
              {this.state.tripInfo.route_long_name}
            </h1>
          </div>
        </header>
        {content}
      </div>
    )
  }
}

export default VehicleLocationBootstrap