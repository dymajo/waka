import React from 'react'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'
import { UiStore } from '../stores/uiStore.js'
import { browserHistory } from 'react-router'

// 3 minutes until we'll hide the trip
const tripDelay = 3 * 6000

class TripItem extends React.Component {
  constructor(props) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
    this.triggerMap = this.triggerMap.bind(this)
    this.triggerTimetable = this.triggerTimetable.bind(this)
    this.expandChange = this.expandChange.bind(this)

    this.state = {
      expanded: false
    }
  }
  componentWillMount() {
    UiStore.bind('expandChange', this.expandChange)
  }
  componentWillUnmount() {
    UiStore.unbind('expandChange', this.expandChange)
  }
  triggerClick() {
    UiStore.setExpandedItem([this.props.collection[0].trip_id, this.props.index])
  }
  triggerMap() {
    browserHistory.push(window.location.pathname + '/realtime/' + this.props.collection[0].trip_id)
  }
  triggerTimetable() {
    const i = this.props.collection[0]
    browserHistory.push(window.location.pathname + '/timetable/' + i.route_short_name + '-' + i.direction_id)
  }
  expandChange(item) {
    if (item[0] === this.props.collection[0].trip_id) { 
      this.setState({
        expanded: !this.state.expanded
      })
    } else if (this.state.expanded === true) {
      this.setState({
        expanded: false
      })
    }
  }
  render() {
    const trip = this.props.collection[0]
    let route_code = trip.route_short_name

    const headsign = trip.trip_headsign.split('/')[0]
    const dir = trip.direction_id === '1' ? 'in' : ''
    const direction = <img src="/icons/direction.svg" className={'direction ' + dir} />
    const background = StationStore.getColor(trip.agency_id, route_code)
    let via = trip.route_long_name.split('Via')
    if (via.length > 1 && SettingsStore.getState().longName === true) {
      via = <small>via {via[1].split(' And')[0]}</small>
    } else {
      via = null
    }

    let route_class = ''
    let route_style = {}
    if (route_code === 'EAST' || route_code === 'WEST' || route_code === 'ONE' || route_code === 'STH' || route_code === 'PUK' || route_code === 'NEX') {
      route_code = route_code.slice(0,1)
      if (route_code === 'P') {
        route_code = 'S'
      }
      route_class = 'cf'
      route_style = {color: background}
    } else if (isNaN(parseInt(route_code.slice(0,1)))) {
      route_class = 'text'
    }

    const times = []
    this.props.collection.forEach((trip) => {
      const arrival = new Date()
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.arrival_time_seconds) % 86400)

      // non realtime bit
      let date = Math.round((arrival - new Date()) / 60000)

      // calculates the realtime component
      if (this.props.realtime[trip.trip_id] && this.props.realtime[trip.trip_id].delay) {
        arrival.setSeconds(arrival.getSeconds() + (this.props.realtime[trip.trip_id].delay))
        let time = Math.abs(Math.round((arrival.getTime()-new Date().getTime())/60000))
        let stops_away_no = trip.stop_sequence - this.props.realtime[trip.trip_id].stop_sequence

        if ((time === 0 || stops_away_no === 0) && times.length === 0) {
          times.push({realtime: 'delay', time: 'Due', dd: this.props.realtime[trip.trip_id].double_decker})
        } else {
          times.push({realtime: 'delay', time: time.toString(), stops: stops_away_no, dd: this.props.realtime[trip.trip_id].double_decker})
        }
      } else if (this.props.realtime[trip.trip_id] && this.props.realtime[trip.trip_id].distance) {
        let time = date
        if (time <= 0 && times.length === 0) {
          time = 'Due'
        }
        times.push({realtime: 'distance', time: time, distance: Math.round(this.props.realtime[trip.trip_id].distance)})
      } else if (date > 0) {
        times.push({realtime: false, time: date.toString()})
      } else {
        times.push({realtime: false, time: 'Due'})
      }
    })
    let latest = times[0]
    let dd = null
    if (latest.dd === true) {
      dd = <img className="dd" src="/icons/big.svg" />
    }
    if (latest.time === 'Due') {
      let className = ''
      if (latest.realtime !== false) {
        className = 'realtime due'
      }
      latest = <h3 className={className}>{dd} <span className="number-small">{latest.time}</span></h3>
    } else if (latest.realtime === 'delay') {
      if (latest.stops > 1) {
        latest = <h3 className="realtime">{dd} <span className="number-small">{latest.stops}</span> stops <span className="opacity">&middot;</span> <span className="number">{latest.time}</span>m</h3>
      } else {
        latest = <h3 className="realtime">{dd} <span className="number-small">{latest.stops}</span> stop <span className="opacity">&middot;</span> <span className="number">{latest.time}</span>m</h3>
      }
    } else if (latest.realtime === 'distance') {
      if (latest.distance > 0) {
        latest = <h3 className="realtime"><span className="number-small">{latest.distance}</span>km <span className="opacity">&middot;</span> <span className="number">{latest.time}</span>m</h3>
      } else {
        latest = <h3 className="realtime"><span className="number">{latest.time}</span>m</h3>
      }
    } else {
      latest = <h3><span className="number">{latest.time}</span>m</h3>
    }
    let andIn = null
    if (times.length > 1) {
      const timesarr = [times[1].time]
      if (times.length > 2) {
        timesarr.push(times[2].time)
      }
      andIn = <h4>and in <strong>{timesarr.join(', ')}</strong> min</h4>
    } else if (parseInt(times[0].time) < 60) {
      andIn = <h4><span className="last">Last</span></h4>
    }
    let className = 'colored-trip'
    if (this.state.expanded) {
      className += ' expanded'
    }
    return (
      <li className={className} style={{background: background}}>
        <div className="main" onTouchTap={this.triggerClick}>
          <div className="left">
            <h1 className={route_class} style={route_style}>{route_code}</h1>
            <h2>{direction}{headsign} {via}
            </h2>
          </div>
          <div className="right">
            {latest}
            {andIn}
          </div>
        </div>
        <div className="bottom">
          <button onTouchTap={this.triggerMap}><img src="/icons/map.svg"/>Map</button>
          <button onTouchTap={this.triggerTimetable}><img src="/icons/timetable.svg"/>Timetable</button>
        </div>
      </li>
    )
  }
  
}
export default TripItem