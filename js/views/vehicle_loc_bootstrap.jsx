import React from 'react'
import { browserHistory } from 'react-router'
import { StationStore } from '../stores/stationStore.js'

// this is hacked so it handles the current location
// and just normal people looking up a line
class VehicleLocationBootstrap extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showContent: false,
      selectedLine: 0,
      tripInfo: {},
      lineInfo: []
    }

    this.lineMountCb = this.lineMountCb.bind(this)
    this.tripMountCb = this.tripMountCb.bind(this)
  }
  componentWillMount() {
    if ('line_id' in this.props.params) {
      return this.lineMountCb(this.props)
    }
    this.tripMountCb(this.props)
  }
  componentDidMount() {
    require.ensure(['react-leaflet'], () => {
      this.VehicleLocation = require('./vehicle_loc.jsx').default
      this.setState({
        showContent: true
      })
    })

    if ('line_id' in this.props.params) {
      fetch(`/a/line/${this.props.params.line_id}`).then((response) => {
        response.json().then((data) => {
          let tripInfo = JSON.parse(JSON.stringify(this.state.tripInfo))
          tripInfo.route_long_name = data[0].route_long_name
          tripInfo.shape_id = data[0].shape_id
          this.setState({
            lineInfo: data,
            selectedLine: 0,
            tripInfo: tripInfo
          })
        })
      })
    }
  }
  componentWillReceiveProps(newProps) {
    if ('line_id' in newProps.params) {
      return this.lineMountCb(newProps)
    }
    this.tripMountCb(newProps)
  }
  lineMountCb(newProps) {
    let tripInfo = {
      route_short_name: newProps.params.line_id
    } 
    if (typeof(newProps.operators) !== 'undefined') {
      tripInfo.agency_id = newProps.operators[newProps.params.line_id]
    }
    this.setState({
      tripInfo: tripInfo
    })
  }
  tripMountCb(newProps) {
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
      if ('line_id' in this.props.params) {
        let stopInfo = [-36.844229, 174.767823]
        content = (<this.VehicleLocation 
            params={this.props.params}
            lineInfo={this.state.lineInfo}
            tripInfo={this.state.tripInfo}
            stopInfo={stopInfo}
          />
        )
      } else {
        let stopInfo = this.props.stopInfo
        if (typeof(stopInfo[0]) === 'undefined') {
          stopInfo = [-36.844229, 174.767823]
        }
        content = (
          <this.VehicleLocation 
            realtime={this.props.realtime}
            params={this.props.params}
            trips={this.props.trips}
            tripInfo={this.state.tripInfo}
            stopInfo={stopInfo}
          />
        )
      }
    }
    return (
      <div className='vehicle-location-container'>
        <header className='material-header'>
          <div>
            <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
            <h1 className='line-name'>
              <span className='line-pill' style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>
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

VehicleLocationBootstrap.propTypes = {
  params: React.PropTypes.object
}

export default VehicleLocationBootstrap