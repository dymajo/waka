import React from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { View, StyleSheet } from 'react-native'

import StationStore from '../../stores/StationStore.js'
import SettingsStore from '../../stores/SettingsStore.js'
import { t } from '../../stores/translationStore.js'
import Header from '../reusable/Header.jsx'
import LinkedScroll from '../reusable/LinkedScroll.jsx'

const language = navigator.language || 'en'

class Timetable extends React.Component {
  static propTypes = {
    match: PropTypes.object,
    history: PropTypes.object,
  }

  state = {
    trips: [],
    tripInfo: {},
    loading: true,
    loadingMode: false,
    stopName: '',
    error: null,
    offset: 0,
  }

  times = {}

  failures = 0

  linkedScroll = React.createRef()

  componentDidMount() {
    this.getData()
    window.addEventListener('online', this.triggerRetry)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.triggerRetry)
  }

  _tripsMap(data) {
    const tripsArr = []
    let lastTrip = null
    data.forEach(trip => {
      trip.day = new Date(trip.date)
      trip.date = new Date(trip.departure_time_seconds * 1000)
      if (lastTrip) {
        if (lastTrip.getUTCHours() !== trip.date.getUTCHours()) {
          const day = trip.day.toLocaleDateString(language, { weekday: 'long' })
          tripsArr.push({
            seperator: `${day} ${trip.date.getUTCHours()}`,
          })
        }
      } else {
        const day = trip.day.toLocaleDateString(language, { weekday: 'long' })
        tripsArr.push({
          seperator: `${day} ${trip.date.getUTCHours()}`,
        })
      }
      lastTrip = trip.date
      tripsArr.push(trip)
    })
    return tripsArr
  }

  getData() {
    if (!navigator.onLine) {
      this.setState({
        error: t('app.nointernet'),
        loading: false,
      })
      return
    }
    const route = this.props.match.params.route_name.split('-')[0]
    const tripNodeMatches = item => item.route_short_name === route
    StationStore.getData(
      this.props.match.params.station,
      this.props.match.params.region
    ).then(data => {
      this.setState({
        tripInfo:
          StationStore.tripData.find(tripNodeMatches) || this.state.tripInfo,
        stopName: data.name || data.stop_name,
      })
    })

    this.getTimetable()
      .then(() => {
        requestAnimationFrame(() => {
          let time = new Date(
            new Date().getTime() + StationStore.offsetTime
          ).getHours()
          let found = false
          while (found === false && time > 0) {
            if (`time${time}` in this.times) {
              found = true
            } else {
              time -= 1
            }
          }
          // sets scroll height
          if (found) {
            // adds height of header to it
            const scrollView = this.linkedScroll.current.scrollView.current
            const pos =
              this.times[`time${time}`].getBoundingClientRect().top -
              scrollView.getInnerViewNode().getBoundingClientRect().top
            scrollView.scrollTo({ y: pos, animated: false })
          }
        })
      })
      .catch(() => {
        this.setState({ error: t('timetable.error') })
      })
  }

  triggerRetry = () => {
    this.setState({
      error: null,
      loading: true,
    })
    this.getData(this.props)
  }

  getTimetable = () => {
    if (this.state.loadingMore === true) {
      return
    }
    this.setState({
      loadingMore: true,
    })
    const params = this.props.match.params
    const route_name = params.route_name.split('-')
    return StationStore.getTimetable(
      params.station,
      route_name[0],
      route_name[1],
      params.region,
      this.state.offset
    )
      .then(data => {
        this.setState({
          trips: this.state.trips.concat(this._tripsMap(data)),
          loading: false,
          loadingMore: false,
          offset: this.state.offset + 1,
        })

        if (data.length === 0 && this.failures < 7) {
          this.failures++
          this.getTimetable() // recursive woo
        }
      })
      .catch(() => {
        this.setState({
          loading: false,
          loadingMore: false,
        })
      })
  }

  triggerScroll = e => {
    // intersection observer would be great, but have to support safari
    // and can't really be bothered shipping the polyfill yet
    const offset =
      e.nativeEvent.contentSize.height -
      e.nativeEvent.contentOffset.y -
      e.nativeEvent.layoutMeasurement.height
    if (offset < 800) {
      this.getTimetable()
    }
  }

  render() {
    let opacity = false
    let loading
    let empty = null
    if (this.state.loading) {
      loading = <div className="spinner" />
    } else if (this.state.error !== null) {
      loading = (
        <div className="error">
          <p>{this.state.error}</p>
          <button className="nice-button primary" onClick={this.triggerRetry}>
            {t('app.errorRetry')}
          </button>
        </div>
      )
    } else if (this.state.trips.length === 0) {
      empty = (
        <div className="error">
          <p>{t('timetable.empty')}</p>
        </div>
      )
    }
    const offsetTime = new Date().getTime() + StationStore.offsetTime

    const currentTime = parseInt(
      new Date(offsetTime).getHours().toString() +
        `0${new Date(offsetTime).getMinutes()}`.slice(-2)
    )
    return (
      <View style={styles.wrapper}>
        <Header title={t('timetable.title')} subtitle={this.state.stopName} />
        <LinkedScroll onScroll={this.triggerScroll} ref={this.linkedScroll}>
          <View className="timetable-content">
            {loading}
            {empty}
            <ul>
              {this.state.trips.map((item, key) => {
                if ('seperator' in item) {
                  let timeString = `${item.seperator.split(' ')[0]} `
                  const seperator = parseInt(item.seperator.split(' ')[1])

                  if (SettingsStore.state.clock) {
                    timeString += `${seperator}:00`
                  } else {
                    timeString += `${
                      seperator % 12 === 0 ? 12 : seperator % 12
                    }:00`
                    timeString += seperator >= 12 ? ' PM' : ' AM'
                  }
                  return (
                    <li
                      key={key}
                      ref={e => (this.times[`time${seperator}`] = e)}
                      className="seperator"
                    >
                      {timeString}
                    </li>
                  )
                }
                const absotime = parseInt(
                  item.date.getUTCHours() +
                    `0${item.date.getUTCMinutes()}`.slice(-2)
                )
                const name = item.route_long_name.split('Via')

                let timestring
                if (SettingsStore.state.clock) {
                  timestring = `${item.date.getUTCHours()}:${`0${item.date.getUTCMinutes()}`.slice(
                    -2
                  )}`
                } else {
                  timestring = `${
                    item.date.getUTCHours() % 12 === 0
                      ? 12
                      : item.date.getUTCHours() % 12
                  }:${`0${item.date.getUTCMinutes()}`.slice(-2)}`
                  timestring += item.date.getUTCHours() >= 12 ? ' PM' : ' AM'
                }

                let className = ''
                if (absotime > currentTime && opacity === false) {
                  opacity = true
                }
                if (!opacity) {
                  className += 'opacity'
                }
                return (
                  <li key={key} className={className}>
                    <div className="left">
                      {item.trip_headsign}
                      {name.length > 1 ? <small> via {name[1]}</small> : ''}
                    </div>
                    <div className="right">{timestring}</div>
                  </li>
                )
              })}
            </ul>
          </View>
        </LinkedScroll>
      </View>
    )
  }
}
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
})
export default withRouter(Timetable)
