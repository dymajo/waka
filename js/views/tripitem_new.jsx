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
      via = <small>via {via[1]}</small>
    } else {
      via = null
    }

    const times = []
    console.log(this.props)
    this.props.collection.forEach(function(trip) {
      // console.log(trip)
      const arrival = new Date()
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.arrival_time_seconds))

      // makes times like 4:9 -> 4:09
      let date = Math.round((arrival - new Date()) / 60000)
      if (date > 0) {
        times.push(date.toString())  
      } else {
        times.push('Due')
      }
    })
    let latest = times[0]
    if (latest !== 'Due') {
      latest = latest + 'min'
    }
    let andIn = null
    if (times.length > 1) {
      andIn = <h4>and in <strong>{times.slice(1, 3).join(', ')}</strong> min</h4>
    }

    return (
      <li onTouchTap={this.triggerClick} className="colored-trip" style={{background: background}}>
        <div className="left">
          <h1>{route_code}</h1>
          <h2>{direction}{headsign} {via}
          </h2>
        </div>
        <div className="right">
          <h3>{latest}</h3>
          {andIn}
        </div>
      </li>
    )
  }
  
}
export default TripItem