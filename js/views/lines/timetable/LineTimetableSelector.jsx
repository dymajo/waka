import React from 'react'
import PropTypes from 'prop-types'

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { vars } from '../../../styles.js'

import { getTime } from '../../../helpers/date.js'

const formatDate = (dateString, delay, isTwentyFourHour, region) => {
  const date = new Date(dateString)
  date.setTime(date.getTime() + delay * 1000)
  const humanTime = getTime(date, isTwentyFourHour, true, region)

  // make this nicer
  return `${humanTime.text || ''}${humanTime.subtext || ''}${
    humanTime.minutes ? `${humanTime.minutes} min` : ''
  }`
}

let styles = null

const LineTimetableSelector = ({
  timetable,
  currentTrip,
  triggerTrip,
  realtimeStopUpdates,
  region,
  isTwentyFourHour = false,
}) => {
  const tripIds = {}
  return (
    <View style={styles.departures}>
      {timetable
        .map(service => {
          const realtimeTrip = realtimeStopUpdates[service.trip_id]
          if (
            realtimeTrip &&
            realtimeTrip.stopTimeUpdate &&
            realtimeTrip.stopTimeUpdate.length > 0
          ) {
            let stop = realtimeTrip.stopTimeUpdate.find(
              i => i.stopSequence === service.stop_sequence
            )
            if (!stop) [stop] = realtimeTrip.stopTimeUpdate
            service.realtimeStop = stop

            if (stop.stopSequence) {
              service.visible =
                stop.stopSequence <= service.stop_sequence ||
                service.trip_id === currentTrip
            }
          }
          return service
        })
        .filter(service => {
          // ensures that services that start and finish at the same place with the same trip_id don't show up more than once
          const uniqueKey = service.trip_id + service.dateOffset
          tripIds[uniqueKey] = (tripIds[uniqueKey] || 0) + 1
          return service.visible === true && tripIds[uniqueKey] === 1
        })
        .map(service => {
          let departureTextStyle = null
          let emotion = null
          let delay = 0

          let scheduleRelationship = 'scheduled'
          if (service.dateOffset > 0) {
            const dayOfWeek = new Date(
              service.departure_time || service.arrival_time
            ).toLocaleString('en', { weekday: 'long' })
            scheduleRelationship = dayOfWeek
          }

          // assume that realtime is only valid for today's trip (i.e 18 hours from now)
          const serviceDifference =
            new Date(service.departure_time || service.arrival_time).getTime() -
            new Date().getTime()
          if (service.realtimeStop && serviceDifference < 64800000) {
            const stop = service.realtimeStop
            scheduleRelationship = stop.scheduleRelationship.toLowerCase()

            const estimate = stop.departure || stop.arrival
            if (
              stop.scheduleRelationship === 'SCHEDULED' &&
              estimate != undefined &&
              estimate.delay != undefined
            ) {
              delay = estimate.delay

              const delayText = `(${Math.ceil(Math.abs(delay) / 60)}m)`
              if (delay < -90) {
                emotion = styles.neutral
                scheduleRelationship = <>early {delayText}</>
              } else if (delay < 180) {
                emotion = styles.positive
                scheduleRelationship = 'on time'
              } else if (delay >= 180) {
                emotion = styles.negative
                scheduleRelationship = <>late {delayText}</>
              }
            } else if (stop.scheduleRelationship === 'CANCELLED') {
              departureTextStyle = styles.cancelled
              emotion = styles.negative
            }
          }
          return (
            <TouchableOpacity
              key={[
                service.trip_id,
                service.departure_time,
                service.dateOffset,
              ].join()}
              style={
                currentTrip === service.trip_id
                  ? [styles.departure, styles.departureSelected]
                  : styles.departure
              }
              onPress={triggerTrip(service.trip_id)}
            >
              <Text style={[styles.departureDate, departureTextStyle]}>
                {formatDate(
                  service.departure_time,
                  delay,
                  isTwentyFourHour,
                  region
                )}
              </Text>
              <Text style={[styles.departureStatus, emotion]}>
                {scheduleRelationship}
              </Text>
            </TouchableOpacity>
          )
        })}
    </View>
  )
}

LineTimetableSelector.propTypes = {
  currentTrip: PropTypes.string,
  timetable: PropTypes.arrayOf(
    PropTypes.shape({
      trip_id: PropTypes.string.isRequired,
      departure_time: PropTypes.string.isRequired,
    })
  ).isRequired,
  triggerTrip: PropTypes.func.isRequired,
}

LineTimetableSelector.defaultProps = {
  currentTrip: '',
}

styles = StyleSheet.create({
  departures: {
    flexDirection: 'row',
    overflowX: 'scroll',
    paddingBottom: vars.padding / 2,
  },
  departure: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    width: `calc(33.3333% - ${Math.floor((vars.padding * 4) / 3)}px)`,
    marginLeft: vars.padding,
    borderRadius: 3,
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
  },
  departureSelected: {
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  departureDate: {
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: vars.fontFamily,
    fontSize: 16,
  },
  cancelled: {
    textDecorationStyle: 'solid',
    textDecorationLine: 'line-through',
  },
  departureStatus: {
    textAlign: 'center',
    fontFamily: vars.fontFamily,
    fontSize: 13,
    color: '#888',
    textTransform: 'capitalize',
  },
  positive: {
    color: '#27ae60',
  },
  neutral: {
    color: '#2980b9',
  },
  negative: {
    color: '#c0392b',
  },
})
export default LineTimetableSelector
