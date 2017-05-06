import React from 'react'
import { StationStore } from '../stores/stationStore.js'
import { SettingsStore } from '../stores/settingsStore.js'
import { browserHistory } from 'react-router'

// 3 minutes until we'll hide the trip
const tripDelay = 3 * 6000

class TripItem extends React.Component {
  constructor(props) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
  }
  triggerClick() {
    browserHistory.push(window.location.pathname + '/' + this.props.trip_id)
  }
  render() {
    const trip = this.props.collection[0]
    const route_code = trip.route_short_name
    const headsign = trip.trip_headsign.split('/')[0]
    const dir = trip.direction_id === '1' ? 'in' : ''
    const direction = <img src="/icons/direction.svg" className={'direction ' + dir} />
    const background = StationStore.getColor(trip.agency_id, route_code)
    let via = trip.route_long_name.split('Via')
    if (via.length > 1) {
      via = <small>via {via[1].split(' And')[0]}</small>
    } else {
      via = null
    }

    const times = []
    console.log(this.props)
    this.props.collection.forEach((trip) => {
      // console.log(trip)
      const arrival = new Date()
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.arrival_time_seconds))

      // non realtime bit
      let date = Math.round((arrival - new Date()) / 60000)

      // calculates the realtime component
      if (this.props.realtime[trip.trip_id] && this.props.realtime[trip.trip_id].delay) {
        arrival.setSeconds(arrival.getSeconds() + (this.props.realtime[trip.trip_id].delay))
        let time = Math.abs(Math.round((arrival.getTime()-new Date().getTime())/60000))
        let stops_away_no = trip.stop_sequence - this.props.realtime[trip.trip_id].stop_sequence

        if (time === 0 || stops_away_no === 0) {
          times.push({realtime: 'delay', time: 'Due'})
        } else {
          times.push({realtime: 'delay', time: time.toString(), stops: stops_away_no})
        }
      } else if (this.props.realtime[trip.trip_id] && this.props.realtime[trip.trip_id].distance) {
        let time = date
        if (time <= 0) {
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
    if (latest.time === 'Due') {
      latest = <h3><span className="number-small">{latest.time}</span></h3>
    } else if (latest.realtime === 'delay') {
      if (latest.stops > 1) {
        latest = <h3 className="realtime"><span className="number-small">{latest.stops}</span> stops <span className="opacity">&middot;</span> <span className="number">{latest.time}</span>m</h3>
      } else {
        latest = <h3 className="realtime"><span className="number-small">{latest.stops}</span> stop <span className="opacity">&middot;</span> <span className="number">{latest.time}</span>m</h3>
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
    }

    return (
      <li onTouchTap={this.triggerClick} className="colored-trip" style={{background: background}}>
        <div className="left">
          <h1>{route_code}</h1>
          <h2>{direction}{headsign} {via}
          </h2>
        </div>
        <div className="right">
          {latest}
          {andIn}
        </div>
      </li>
    )
  }
  
}
export default TripItem