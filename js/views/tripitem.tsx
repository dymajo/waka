import * as React from 'react'
import { StationStore } from '../stores/stationStore.ts'
import { SettingsStore } from '../stores/settingsStore.ts'

interface RealTimeItem {
  delay: number,
  stop_sequence: number,
  timestamp: number,
  v_id: string,
  double_decker: boolean
}
interface RealTimeMap {
  [name: string]: RealTimeItem;
}

interface ITripItemProps extends React.Props<TripItem> {
  code: string,
  name: string,
  long_name: string,
  time: string,
  trip_id: string,
  station: string,
  stop_sequence: number,
  stop_code: string,
  realtime: RealTimeItem,
  agency_id: string
}

class TripItem extends React.Component<ITripItemProps, {}> {
  constructor(props: ITripItemProps) {
    super(props)
    this.triggerClick = this.triggerClick.bind(this)
  }
  public triggerClick() {
    console.log('navigating to', this.props.trip_id)
    // browserHistory.push(this.props.trip_id)
  }
  public render() {
    var arrival = new Date()
    arrival.setHours(0)
    arrival.setMinutes(0)
    arrival.setSeconds(parseInt(this.props.time))

    // makes times like 4:9 -> 4:09
    var minutes = arrival.getMinutes().toString()
    if (arrival.getMinutes() < 10) {
      minutes = '0' + minutes.toString()
    }
    var timestring = arrival.getHours() + ':' + minutes

    if (this.props.realtime) {
      arrival.setSeconds(arrival.getSeconds() + (this.props.realtime.delay))
      let time = Math.abs(Math.round((arrival.getTime()-new Date().getTime())/60000))
      if (time === 0) {
        timestring = 'due'
      } else {
        timestring = time.toString() + 'm'
      }
    }

    // works out how many stops away the bus is
    var stops_away = ''
    var emoji = ''
    var stops_away_no
    if (this.props.realtime) {
      stops_away_no = this.props.stop_sequence - this.props.realtime.stop_sequence
      if (this.props.realtime.double_decker) {
        emoji = ' Ⓜ️'
      }
      if (stops_away_no < 0) {
        stops_away = 'Departed' // let the rider down :(
      } else if (stops_away_no === 0) {
        //stops_away = 'Arrived' // usually departed
        stops_away = 'Departed'
      } else if (stops_away_no === 1) {
        if (timestring === 'due') {
          stops_away = <span>{stops_away_no} stop away</span>
        } else {
          stops_away = <span>{stops_away_no} stop away &middot; <time>{timestring}</time></span>
        }
      } else {
        stops_away = <span>{stops_away_no} stops away &middot; <time>{timestring}</time></span>
      }
      if (window.location.hash === '#debug') {
        stops_away = <span><time>{stops_away_no}</time> {this.props.realtime.v_id}</span>
      }
    } else {
      stops_away = <span>Scheduled <time>{timestring}</time></span>
    }

    // logic for visibility
    var visibility = true
    // date check
    if (new Date().getTime() > arrival.getTime()) {
      visibility = false
    }

    // but if there's a stops away
    var active
    if (stops_away_no > stops_threshold) {
      visibility = true
      active = 'active'
    }

    // not sure if we need to do other checks?
    var className = ''
    if (!visibility) {
      className = 'hidden'
    }

    var via
    if (SettingsStore.getState().longName) {
      var viaSplit = this.props.long_name.split('Via ')
      if (viaSplit.length > 1) {
        via = <small> via {viaSplit[1].replace('And', 'and')}</small>
        className += ' via'
      }
    }

    // if it's a busway station, don't show the departed ones
    var stops_threshold = -1
    if (this.props.stop_code.split('+').length > 1) {
      stops_threshold = 0
      via = <small>{StationStore.getPlatform(this.props.station)}</small>
      className += ' via'
    }
    
    // remove train station because it's unecessary
    var name = this.props.name.replace(' Train Station', '')
    name = name.replace(' Ferry Terminal', '')

    // removed <li>›</li> for now
    var roundelStyle
    var code = this.props.code
    if (this.props.code === 'WEST' || this.props.code === 'EAST' || this.props.code === 'ONE' || this.props.code === 'STH' || this.props.code === 'NEX') {
      roundelStyle = 'cf'
      code = this.props.code[0]
    }

    return (
      <li className={className}><ul className={active}>
        <li>
          <div className={roundelStyle} style={{backgroundColor: StationStore.getColor(this.props.agency_id, this.props.code)}}>
            {code}
          </div>
        </li>
        <li>{name}{emoji}{via}</li>
        <li>{stops_away}</li>
        
      </ul></li>
    )
  }
  
}
export default TripItem