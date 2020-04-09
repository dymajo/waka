import React, { Component } from 'react'
import { View, Text, StyleSheet } from 'react-native'

import LineData from '../../../data/LineData.js'
import SettingsStore from '../../../stores/SettingsStore.js'
import LineTimetableSelector from './LineTimetableSelector.jsx'
import Spinner from '../../reusable/Spinner.jsx'
import { vars } from '../../../styles.js'

let styles = null

export class LineTimetable extends Component {
  constructor(props) {
    super(props)

    const { region, tripId, stopId } = props
    this.lineData = new LineData({
      region,
      trip_id: tripId,
      stop_id: stopId,
    })

    this.state = {
      timetable: [],
    }
  }

  componentDidMount() {
    this.getTimetable()
  }

  componentDidUpdate(prevProps) {
    const { stopId, line, agencyId, directionId } = this.props
    if (
      stopId !== prevProps.stopId ||
      line !== prevProps.line ||
      agencyId !== prevProps.agencyId ||
      directionId !== prevProps.directionId
    ) {
      console.info('Getting new data')
      this.getTimetable()
    }
  }

  getTimetable = async () => {
    const {
      line,
      stopId,
      agencyId,
      directionId,
      triggerTrip,
      setRealtimeTrips,
    } = this.props
    // this will be invoked again properly
    if (stopId === null) return
    this.lineData.route_short_name = line
    this.lineData.stop_id = stopId
    this.lineData.agency_id = agencyId
    this.lineData.direction_id = directionId

    const getTimetableState = rawData => {
      const tolerance = 1000 * 60 * 30
      const visibleTolerance = 1000 * 60 * 2
      const realtimeTolerance = 1000 * 60 * 90
      const now = new Date(new Date().getTime() - tolerance)
      const visibleNow = new Date(new Date().getTime() - visibleTolerance)
      const realtimeNow = new Date(new Date().getTime() + realtimeTolerance)
      const newState = {
        timetable: rawData
          .filter(service => {
            return now < new Date(service.departure_time)
          })
          .sort(
            (a, b) => new Date(a.departure_time) > new Date(b.departure_time)
          )
          .map(service => ({
            ...service,
            visible: visibleNow < new Date(service.departure_time),
            realtimeQuery: new Date(service.departure_time) < realtimeNow,
          })),
      }
      const { tripId } = this.props
      if (tripId == null && newState.timetable.length > 0) {
        const selectedTrip = newState.timetable.find(a => a.visible === true)
        if (selectedTrip) {
          // sends the computed trip id back up to the parent component
          triggerTrip(selectedTrip.trip_id)()
        }
      }
      return newState
    }

    try {
      const timetableData = await this.lineData.getTimetable(0)
      this.setState(getTimetableState(timetableData), async () => {
        const { timetable } = this.state
        setRealtimeTrips(timetable, true)

        const tomorrowTimetableData = await this.lineData.getTimetable(1)
        const newState = getTimetableState(
          timetable.slice().concat(tomorrowTimetableData)
        )

        setRealtimeTrips(newState.timetable, false)

        this.setState(newState, async () => {
          if (newState.timetable.length > 0) return
          // direction id 2 is the magical both directions
          this.lineData.direction_id = 2
          const widerTimetableData = await this.lineData.getTimetable(0)
          if (widerTimetableData.length > 0) {
            this.setState(getTimetableState(widerTimetableData))
          } else {
            this.setState(() => {
              throw new Error(
                'We didn’t find any services for this line within the next few days.'
              )
            })
          }
        })
      })
    } catch (err) {
      // cannot get timetable, usually because the stop_id is undefined
      throw new Error(err.message)
    }
  }

  render() {
    const { tripId, region, triggerTrip, realtimeStopUpdates } = this.props
    const { timetable } = this.state

    return (
      <View>
        <Text style={styles.direction}>Departures</Text>
        {timetable.length === 0 ? (
          <Spinner /> // could potentially do a nicer loading state in the future
        ) : (
          <LineTimetableSelector
            region={region}
            currentTrip={tripId}
            triggerTrip={triggerTrip}
            isTwentyFourHour={SettingsStore.state.isTwentyFourHour}
            timetable={timetable}
            realtimeStopUpdates={realtimeStopUpdates}
          />
        )}
      </View>
    )
  }
}
styles = StyleSheet.create({
  direction: {
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingBottom: vars.padding * 0.5,
    fontWeight: '600',
    fontSize: vars.defaultFontSize,
    fontFamily: vars.fontFamily,
  },
})
