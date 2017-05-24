import React from 'react'

import { iOS } from '../models/ios.js'
import { StationStore } from '../stores/stationStore.js'
import { UiStore } from '../stores/uiStore.js'

export default class Timetable extends React.Component {
  constructor(props) {
    super(props)
    
    this.tripMountCb = this.tripMountCb.bind(this)
    this.goingBack = this.goingBack.bind(this)

    this.state = {
      trips: [],
      tripInfo: {},
      runAnimation: false,
      loading: true
    }
  }
  componentWillMount() {
    this.tripMountCb(this.props)

    this.setState({
      runAnimation: true
    })
    setTimeout(() => {
      this.setState({
        runAnimation: false
      })
    }, UiStore.animationTiming)
  }
  componentDidMount() {
    this.getData()
    UiStore.bind('goingBack', this.goingBack)
  }
  componentWillUnmount() {

    UiStore.unbind('goingBack', this.goingBack)
  }
  goingBack() {
    if (UiStore.state.goingBack) {
      this.setState({
        goingBack: true
      })
    }
  }
  componentWillReceiveProps(newProps) {
    this.tripMountCb(newProps)
  }
  getData() {
    const sortfn = function(a, b) {
      return a.arrival_time_seconds - b.arrival_time_seconds
    }
    const r = this.props.params.route_name.split('-')
    fetch(`/a/station/${this.props.params.station}/timetable/${r[0]}/${r[1]}`).then((request) => {
      request.json().then((data) => {
        data.sort(sortfn)

        const tripsArr = []
        let lastTrip = null
        data.forEach((trip) => {
          trip.date = new Date(trip.arrival_time_seconds * 1000)
          if (lastTrip) {
            if (lastTrip.getUTCHours() !== trip.date.getUTCHours()) {
              tripsArr.push({
                seperator: trip.date.getUTCHours()
              })
            }
          } else {
            tripsArr.push({
              seperator: trip.date.getUTCHours()
            })
          }
          lastTrip = trip.date
          tripsArr.push(trip)
        })
      
        this.setState({
          trips: tripsArr,
          loading: false
        })

        requestAnimationFrame(() => {
          let time = new Date().getHours()
          let found = false
          while (found === false && time > 0) {
            if (('time'+time) in this.refs) {
              found = true
            } else {
              time = time - 1
            }
          }
          // sets scroll height
          if (found) {
            this.refs.container.scrollTop = this.refs['time' + time].getBoundingClientRect().top
          }
        })
      })
    })
  }
  tripMountCb(newProps) {
    const route = newProps.params.route_name.split('-')[0]
    let tripNodeMatches = (item) => {
      return item.route_short_name === route
    }
    this.setState({
      tripInfo: newProps.trips.find(tripNodeMatches) || this.state.tripInfo
    })
  }
  triggerBack(){
    let newUrl = window.location.pathname.split('/')
    newUrl.splice(-2)  
    UiStore.navigateSavedStations(newUrl.join('/'))
  }
  render() {
    let styles = {}
    if (this.state.runAnimation && UiStore.getAnimationIn()) {
      styles.animation = UiStore.getAnimationIn()
    } else if (this.state.goingBack) {
      Object.assign(styles, UiStore.getAnimationOut())
    }

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

    let opacity = false
    let loading
    if (this.state.loading) {
      loading = (
        <div className="spinner" />
      )
    }

    const currentTime = parseInt(new Date().getHours().toString() + ('0' + new Date().getMinutes()).slice(-2))
    return (
      <div className='timetable-container' style={styles}>
        <header className='material-header'>
          <div>
          <span className="back" onTouchTap={this.triggerBack}><img src="/icons/back.svg" /></span>
          <span className={roundelStyle} style={{backgroundColor: StationStore.getColor(this.state.tripInfo.agency_id, this.state.tripInfo.route_short_name)}}>
            {code}
          </span>
          <h1 className='line-name'>Timetable</h1>
          <h2>{this.props.stopName}</h2>
          </div>
        </header>
        <div className="timetable-content" ref="container">
          {loading}
          <ul>
            {this.state.trips.map(function(item, key) {
              if ('seperator' in item) {
                let timeString = (item.seperator % 12 === 0 ? 12 : item.seperator % 12) + ':00'
                timeString += item.seperator >= 12 ? ' PM' : ' AM'
                return <li key={key} ref={'time'+item.seperator} className="seperator">{timeString}</li>
              }
              const absotime = parseInt(item.date.getUTCHours() + ('0' + item.date.getUTCMinutes()).slice(-2))
              const name = item.route_long_name.split('Via')
              let timestring = (item.date.getUTCHours() % 12 === 0 ? 12 : item.date.getUTCHours() % 12) + ':' + ('0' + item.date.getUTCMinutes()).slice(-2)
              timestring += item.date.getUTCHours() >= 12 ? ' PM' : ' AM'

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
                  <div className="right">
                    {timestring}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }
}