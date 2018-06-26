import React from 'react'
import { withRouter } from 'react-router'

import { StationStore } from '../../stores/stationStore.js'
import { SettingsStore } from '../../stores/settingsStore.js'
import { UiStore } from '../../stores/uiStore.js'
import { t } from '../../stores/translationStore.js'

import DirectionIcon from '../../../dist/icons/direction.svg'
import BigIcon from '../../../dist/icons/big.svg'
import MapIcon from '../../../dist/icons/station.svg'
import TimetableIcon from '../../../dist/icons/timetable.svg'

// 3 minutes until we'll hide the trip
const tripDelay = 3 * 6000

class TripItem extends React.Component {
  constructor(props) {
    super(props)
    UiStore.bind('expandChange', this.expandChange)

    this.state = {
      expanded: false,
    }
  }
  componentWillUnmount() {
    UiStore.unbind('expandChange', this.expandChange)
  }
  triggerClick = () => {
    UiStore.setExpandedItem([
      this.props.collection[0].trip_id,
      this.props.index,
    ])
  }
  triggerMap = () => {
    const i = this.props.collection[0]
    const url = [
      '/s',
      this.props.match.params.region,
      i.station,
      'realtime/',
    ].join('/')
    this.props.history.push(url + i.trip_id)
  }
  triggerTimetable = () => {
    const i = this.props.collection[0]
    const url = [
      '/s',
      this.props.match.params.region,
      i.station,
      'timetable/',
    ].join('/')
    this.props.history.push(url + i.route_short_name + '-' + i.direction_id)
  }
  expandChange = item => {
    if (item[0] === this.props.collection[0].trip_id) {
      this.setState({
        expanded: !this.state.expanded,
      })
    } else if (this.state.expanded === true) {
      this.setState({
        expanded: false,
      })
    }
  }
  render() {
    const trip = this.props.collection[0]
    let route_code = trip.route_short_name

    const dir = trip.direction_id === 1 ? 'in' : ''
    const direction = <DirectionIcon className={'direction ' + dir} />
    const background = trip.route_color
    let via = trip.route_long_name.split('Via')
    if (
      via.length > 1 &&
      (SettingsStore.getState().longName === true || this.props.vias)
    ) {
      via = (
        <small>
          {t('tripitem.via', { location: via[1].split(' And')[0] })}
        </small>
      )
    } else {
      via = null
    }

    let route_class = ''
    let route_style = {}
    if (
      route_code === 'EAST' ||
      route_code === 'WEST' ||
      route_code === 'ONE' ||
      route_code === 'STH' ||
      route_code === 'PUK' ||
      route_code === 'NEX'
    ) {
      route_code = route_code.slice(0, 1)
      if (route_code === 'P') {
        route_code = 'S'
      }
      route_class = 'cf'
      route_style = { color: background }
    } else if (isNaN(parseInt(route_code.slice(0, 1)))) {
      route_class = 'text'
    }

    this.props.collection.sort((a, b) => {
      let aTime = a.departure_time_seconds
      let bTime = b.departure_time_seconds
      if (
        this.props.realtime[a.trip_id] &&
        this.props.realtime[a.trip_id].delay
      ) {
        aTime = aTime + this.props.realtime[a.trip_id].delay
      }
      if (
        this.props.realtime[b.trip_id] &&
        this.props.realtime[b.trip_id].delay
      ) {
        bTime = bTime + this.props.realtime[b.trip_id].delay
      }
      return aTime - bTime
    })

    const times = []
    const offsetTime = new Date().getTime() + StationStore.offsetTime
    this.props.collection.forEach(trip => {
      const arrival = new Date(offsetTime)
      arrival.setHours(0)
      arrival.setMinutes(0)
      arrival.setSeconds(parseInt(trip.departure_time_seconds) % 86400)

      // non realtime bit
      let date = Math.round((arrival - new Date(offsetTime)) / 60000)

      // calculates the realtime component
      if (
        this.props.realtime[trip.trip_id] &&
        this.props.realtime[trip.trip_id].delay
      ) {
        arrival.setSeconds(
          arrival.getSeconds() + this.props.realtime[trip.trip_id].delay
        )
        let time = Math.abs(
          Math.round(
            (arrival.getTime() - new Date(offsetTime).getTime()) / 60000
          )
        )

        let stops_away_no =
          trip.stop_sequence - this.props.realtime[trip.trip_id].stop_sequence
        if (this.props.realtime[trip.trip_id].stop_sequence === -100) {
          stops_away_no = -100
        }

        if ((time === 0 || stops_away_no === 0) && times.length === 0) {
          times.push({
            realtime: 'delay',
            time: t('tripitem.due'),
            dd: this.props.realtime[trip.trip_id].double_decker,
          })
        } else {
          times.push({
            realtime: 'delay',
            time: time.toString(),
            stops: stops_away_no,
            dd: this.props.realtime[trip.trip_id].double_decker,
          })
        }
      } else if (
        this.props.realtime[trip.trip_id] &&
        this.props.realtime[trip.trip_id].distance
      ) {
        let time = date
        if (time <= 0 && times.length === 0) {
          time = t('tripitem.due')
        }
        times.push({
          realtime: 'distance',
          time: time,
          distance: Math.round(this.props.realtime[trip.trip_id].distance),
        })
      } else if (date > 0) {
        times.push({ realtime: false, time: date.toString() })
      } else if (
        this.props.realtime[trip.trip_id] &&
        this.props.realtime[trip.trip_id].departed
      ) {
        // do nothing?
      } else {
        times.push({ realtime: false, time: t('tripitem.due') })
      }
    })

    let className = 'colored-trip'
    let inner
    if (this.state.expanded) {
      className += ' expanded'
    }
    if (this.state.expanded && times.length > 1) {
      inner = (
        <div className="right">
          {times.slice(0, 3).map((item, key) => {
            const realtime = item.realtime !== false ? 'realtime' : ''
            const className = ''
            const dd =
              item.dd === true ? (
                <span>
                  <strong>BIG</strong> <span className="opacity">&middot;</span>{' '}
                </span>
              ) : null
            if (item.time === t('tripitem.due')) {
              return (
                <h4 className={realtime} key={key}>
                  {dd}
                  <strong>{item.time}</strong>
                </h4>
              )
            } else if (item.realtime === 'delay') {
              const stops = t('tripitem.stops', {
                smart_count: item.stops,
              }).split('&')
              const min = t('tripitem.min', {
                smart_count: parseInt(item.time),
              }).split('&')
              if (item.stops === -100) {
                return (
                  <h4 className={className} key={key}>
                    <strong>{min[0]}</strong> {min[1]}
                  </h4>
                )
              }
              return (
                <h4 className={className} key={key}>
                  {dd}
                  <strong>{stops[0]}</strong>
                  {stops[1]}&nbsp;
                  <span className="opacity">&middot;</span>{' '}
                  <strong>{min[0]}</strong> {min[1]}
                </h4>
              )
            } else {
              const min = t('tripitem.min', { smart_count: item.time }).split(
                '&'
              )
              return (
                <h4 className={className} key={key}>
                  <strong>{min[0]}</strong> {min[1]}
                </h4>
              )
            }
          })}
        </div>
      )
    } else {
      if (times.length === 0) {
        return null
      }
      let latest = times[0]
      let dd = null
      let className = latest.realtime !== false ? 'realtime' : ''
      if (latest.dd === true) {
        dd = <BigIcon className="dd" />
      }
      if (latest.time === t('tripitem.due')) {
        if (latest.realtime !== false) {
          className += ' due'
        }
        latest = (
          <h3 className={className}>
            {dd} <span className="number-small">{latest.time}</span>
          </h3>
        )
      } else if (latest.realtime === 'delay') {
        const stops = t('tripitem.stops', { smart_count: latest.stops }).split(
          '&'
        )
        const minsaway = t('tripitem.minsaway', { time: latest.time }).split(
          '&'
        )
        if (latest.stops === -100) {
          latest = (
            <h3 className={className}>
              {dd}
              <span className="number">{minsaway[0]}</span>
              {minsaway[1]}
            </h3>
          )
        } else {
          latest = (
            <h3 className={className}>
              {dd} <span className="number-small">{stops[0]}</span>
              {stops[1]}&nbsp;
              <span className="opacity">&middot;</span>{' '}
              <span className="number">{minsaway[0]}</span>
              {minsaway[1]}
            </h3>
          )
        }
      } else if (latest.realtime === 'distance' && latest.distance > 0) {
        const kmaway = t('tripitem.kmaway', {
          distance: latest.distance,
        }).split('&')
        const minsaway = t('tripitem.minsaway', { time: latest.time }).split(
          '&'
        )
        latest = (
          <h3 className={className}>
            <span className="number-small">{kmaway[0]}</span>
            {kmaway[1]} <span className="opacity">&middot;</span>{' '}
            <span className="number">{minsaway[0]}</span>
            {minsaway[1]}
          </h3>
        )
      } else {
        const minsaway = t('tripitem.minsaway', { time: latest.time }).split(
          '&'
        )
        latest = (
          <h3 className={className}>
            <span className="number">{minsaway[0]}</span>
            {minsaway[1]}
          </h3>
        )
      }
      let andIn = null
      if (times.length > 1) {
        const timesarr = [times[1].time]
        if (times.length > 2) {
          timesarr.push(times[2].time)
        }
        const and = t('tripitem.and', { times: timesarr.join(', ') }).split('&')
        andIn = (
          <h4>
            {and[0]} <strong>{and[1]}</strong>
            {and[2]}
          </h4>
        )
      } else if (parseInt(times[0].time) < 60) {
        andIn = (
          <h4>
            <span className="last">{t('tripitem.last')}</span>
          </h4>
        )
      }
      inner = (
        <div className="right">
          {latest}
          {andIn}
        </div>
      )
    }
    return (
      <li className={className} style={{ background: background }}>
        <div className="main" onClick={this.triggerClick}>
          <div className="left">
            <h1 className={route_class} style={route_style}>
              {route_code}
            </h1>
            <h2>
              {direction}
              {trip.trip_headsign} {via}
            </h2>
          </div>
          {inner}
        </div>
        <div className="bottom">
          <button onClick={this.triggerMap}>
            <MapIcon />
            {t('tripitem.map')}
          </button>
          <button onClick={this.triggerTimetable}>
            <TimetableIcon />
            {t('tripitem.timetable')}
          </button>
        </div>
      </li>
    )
  }
}
const TripItemWithHistory = withRouter(TripItem)
export default TripItemWithHistory
