import React from 'react'
import PropTypes from 'prop-types'

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { vars } from '../../styles.js'

import { getTime } from '../../helpers/date.js'

const formatDate = dateString => {
  const date = new Date(dateString)
  const humanTime = getTime(date, false, true)

  // make this nicer
  return `${humanTime.text || ''}${humanTime.subtext || ''}${
    humanTime.minutes ? `${humanTime.minutes} min` : ''
  }`
}

let styles = null

const Timetable = ({ timetable, currentTrip, triggerTrip }) => {
  return (
    <View>
      <Text style={styles.direction}>Departures</Text>
      <View style={styles.departures}>
        {timetable
          .filter(service => service.visible === true)
          .map(service => (
            <TouchableOpacity
              key={[service.trip_id, service.departure_time].join()}
              style={
                currentTrip === service.trip_id
                  ? [styles.departure, styles.departureSelected]
                  : styles.departure
              }
              onPress={triggerTrip(service.trip_id)}
            >
              <Text style={styles.departureDate}>
                {formatDate(service.departure_time)}
              </Text>
              <Text style={styles.departureStatus}>Scheduled</Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  )
}

Timetable.propTypes = {
  currentTrip: PropTypes.string,
  timetable: PropTypes.arrayOf(
    PropTypes.shape({
      trip_id: PropTypes.string.isRequired,
      departure_time: PropTypes.string.isRequired,
    })
  ).isRequired,
  triggerTrip: PropTypes.func.isRequired,
}

Timetable.defaultProps = {
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
  departureStatus: {
    textAlign: 'center',
    fontFamily: vars.fontFamily,
    fontSize: 13,
    color: '#888',
  },
  direction: {
    paddingTop: vars.padding,
    paddingLeft: vars.padding,
    paddingBottom: vars.padding * 0.5,
    fontWeight: '600',
    fontSize: vars.defaultFontSize,
    fontFamily: vars.fontFamily,
  },
})
export default Timetable
