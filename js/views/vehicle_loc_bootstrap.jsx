import React from 'react'
import PropTypes from 'prop-types'
import local from '../../local'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

const style = UiStore.getAnimation()

// this is hacked so it handles the current location
// and just normal people looking up a line
class VehicleLocationBootstrap extends React.Component {
  state = {
    showContent: false,
    tripInfo: {},
    stopInfo: {},
    lineInfo: [],
    animation: 'unmounted',
  }

  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }

  componentWillMount() {
    if ('line_id' in this.props.match.params) {
      return this.lineMountCb(this.props)
    }
    this.tripMountCb(this.props)
  }
  componentDidUpdate() {
    if (typeof(this.state.tripInfo.route_long_name) !== 'undefined') {
      if ('line_id' in this.props.match.params) {
        document.title = this.state.tripInfo.route_short_name + ' - ' + this.state.tripInfo.route_long_name + ' - Transit'
      } else {
        document.title = this.state.tripInfo.route_short_name + ' - Live Location - Transit'
      }
    }
  }
  componentDidMount() {
    System.import('./vehicle_loc.jsx').then(module => {
      this.VehicleLocation = module.default
      this.setState({
        showContent: true
      })
    })

    if ('line_id' in this.props.match.params) {
      fetch(`${local}/nz-akl/line/${this.props.match.params.line_id}`).then((response) => {
        response.json().then((data) => {
          let tripInfo = JSON.parse(JSON.stringify(this.state.tripInfo))
          tripInfo.route_long_name = data[0].route_long_name
          tripInfo.shape_id = data[0].shape_id
          tripInfo.route_type = data[0].route_type
          // tripInfo.route_type = data[]
          this.setState({
            lineInfo: data,
            tripInfo: tripInfo
          })
        })
      })
    }
    UiStore.bind('animation', this.animation)
  }
  componentWillUnmount() {
    UiStore.unbind('animation', this.animation)
  }

  animation = (data) => {
    if (data[1] !== this.container) {
      return
    } else if (data[0] === 'exiting' && UiStore.state.exiting.substring(0, window.location.pathname.length) !== window.location.pathname) {
      return
    }
    this.setState({
      animation: data[0]
    })
  }
  lineMountCb = (newProps) => {
    StationStore.getLines().then((data) => {
      this.setState({
        tripInfo: {
          route_short_name: newProps.match.params.line_id,
          agency_id: data.operators[newProps.match.params.line_id]
        }
      })
    })
  }
  tripMountCb = (newProps) => {
    const tripNodeMatches = (item) => {
      return item.trip_id === newProps.match.params.trip_id
    }
    StationStore.getData(this.props.match.params.station).then((data) => {
      this.setState({
        tripInfo: StationStore.tripData.find(tripNodeMatches) || this.state.tripInfo,
        stopInfo: data
      })
    })
  }
  triggerBack = () => {
    let newUrl = window.location.pathname.split('/')
    if (newUrl[3] === 'realtime') {
      newUrl.splice(-2)  
    } else {
      newUrl.splice(-1)
    }
    UiStore.goBack(this.props.history, newUrl.join('/'))
  }
  triggerChange = e => {
    let newLine = this.state.lineInfo[e.currentTarget.value]
    let tripInfo = JSON.parse(JSON.stringify(this.state.tripInfo))

    tripInfo.route_long_name = newLine.route_long_name
    tripInfo.shape_id = newLine.shape_id
    this.setState({
      tripInfo: tripInfo
    })
  }
  render() {
    let content = null
    let lineSelect = this.state.tripInfo.route_long_name || ''
    lineSelect = lineSelect.replace(/ Train Station/g, '')
    
    let roundelStyle = 'line-pill'
    let code = this.state.tripInfo.route_short_name
    if (code === 'WEST' || code === 'EAST' || code === 'ONE' || code === 'STH' || code === 'NEX' || code === 'PUK') {
      roundelStyle += ' cf'
      if (code === 'PUK') {
        code = 'S'
      } else {
        code = code[0]
      }
      if (typeof(this.state.tripInfo.agency_id) === 'undefined') {
        code = ''
      }
    }

    if (this.state.showContent === true && (this.state.animation !== 'entering' || this.state.animation !== 'unmounted')) {
      if ('line_id' in this.props.match.params) {
        let stopInfo = [-36.844229, 174.767823]
        content = (<this.VehicleLocation 
          params={this.props.match.params}
          lineInfo={this.state.lineInfo}
          tripInfo={this.state.tripInfo}
          stopInfo={stopInfo}
        />
        )
        if (this.state.lineInfo.length > 1) {
          lineSelect = this.state.lineInfo.map(function(line, key) {
            return <option key={key} value={key}>{line.route_long_name.replace(/ Train Station/g, '')}</option>
          })
          lineSelect = <select onChange={this.triggerChange}>{lineSelect}</select>
        }
      } else {
        let stopInfo = [this.state.stopInfo.stop_lat, this.state.stopInfo.stop_lon || this.state.stopInfo.stop_lng]
        if (typeof(stopInfo[0]) === 'undefined') {
          stopInfo = [-36.844229, 174.767823]
        }
        content = (
          <this.VehicleLocation 
            trips={StationStore.tripData}
            realtime={StationStore.realtimeData}
            params={this.props.match.params}
            tripInfo={this.state.tripInfo}
            stopInfo={stopInfo}
          />
        )
      }
    }

    return (
      <div className='vehicle-location-container' ref={e => this.container = e} stsyle={style[this.state.animation]}>
        <header className='material-header'>
          <span className="header-left" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
          <div className="header-expand">
            <h1 className='line-name'>
              <section className="line-pill-wrapper-header">
                <span className={roundelStyle} style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>
                  {code}
                </span>
              </section>
              <section className="selectWrapper">{lineSelect}</section>
            </h1>
          </div>
        </header>
        {content}
      </div>
    )
  }
}
export default VehicleLocationBootstrap