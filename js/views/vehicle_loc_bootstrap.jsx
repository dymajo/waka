import React from 'react'
import PropTypes from 'prop-types'
import local from '../../local'

import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'
import { t } from '../stores/translationStore.js'

import BackIcon from '../../dist/icons/back.svg'

const style = UiStore.getAnimation()

// this is hacked so it handles the current location
// and just normal people looking up a line
class VehicleLocationBootstrap extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }
  state = {
    showContent: false,
    tripInfo: {},
    stopInfo: {},
    lineInfo: [],
    animation: 'unmounted',
    online: window.navigator.onLine
  }
  componentDidUpdate() {
    if (typeof(this.state.tripInfo.route_long_name) !== 'undefined') {
      if ('line_id' in this.props.match.params) {
        document.title = this.state.tripInfo.route_short_name + ' - ' + this.state.tripInfo.route_long_name + ' - ' + t('app.name')
      } else {
        document.title = t('vech_loc.header', {route: this.state.tripInfo.route_short_name, appname: t('app.name')})
      }
    }
  }
  componentDidMount() {
    window.addEventListener('online',  this.triggerRetry)
    window.addEventListener('offline',  this.goOffline)
    UiStore.bind('animation', this.animation)

    System.import('./vehicle_loc.jsx').then(module => {
      this.VehicleLocation = module.default
      this.setState({
        showContent: true
      })
    })

    if ('line_id' in this.props.match.params) {
      this.lineMountCb(this.props)
      this.getLineData()
    } else {
      this.tripMountCb(this.props)
    }
  }
  componentWillUnmount() {
    window.removeEventListener('online',  this.triggerRetry)
    window.removeEventListener('offline',  this.goOffline)
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
    StationStore.getLines(newProps.match.params.region).then((data) => {
      this.setState({
        tripInfo: {
          route_short_name: newProps.match.params.line_id,
          agency_id: data.operators[newProps.match.params.line_id]
        }
      })
    })
  }
  getLineData = () => {
    fetch(`${local.endpoint}/${this.props.match.params.region}/line/${this.props.match.params.line_id}`).then((response) => {
      response.json().then((data) => {
        let tripInfo = JSON.parse(JSON.stringify(this.state.tripInfo))
        tripInfo.route_long_name = data[0].route_long_name
        tripInfo.shape_id = data[0].shape_id
        tripInfo.route_type = data[0].route_type
        tripInfo.route_color = data[0].route_color
        
        this.setState({
          lineInfo: data,
          tripInfo: tripInfo
        })
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
    if (newUrl[4] === 'realtime') {
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
  triggerRetry = () => {
    this.setState({
      showContent: false,
      online: window.navigator.onLine
    })
    setTimeout(() => {
      this.setState({
        showContent: true
      })

      if ('line_id' in this.props.match.params) {
        this.lineMountCb(this.props)
        this.getLineData()
        return 
      }
    }, 50)
  }
  goOffline = () => {
    this.setState({
      online: false
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

    let offline = null
    if (!this.state.online) {
      offline = (
        <div className="offline-container">
          <p>You are not connected to the internet.</p>
          <button className="nice-button primary" onClick={this.triggerRetry}>Retry</button>
        </div>
      )
    }

    return (
      <div className='vehicle-location-container' ref={e => this.container = e} style={style[this.state.animation]}>
        <header className='material-header'>
          <span className="header-left" onTouchTap={this.triggerBack}><BackIcon /></span>
          <div className="header-expand">
            <h1 className='line-name'>
              <section className="line-pill-wrapper-header">
                <span className={roundelStyle} style={{backgroundColor: this.state.tripInfo.route_color}}>
                  {code}
                </span>
              </section>
              <section className="selectWrapper">{lineSelect}</section>
            </h1>
          </div>
        </header>
        {content}
        {offline}
      </div>
    )
  }
}
export default VehicleLocationBootstrap