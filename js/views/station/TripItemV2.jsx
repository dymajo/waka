import React from 'react'
import { View, Text, StyleSheet } from 'react-native-web'
import { vars } from '../../styles.js'

import DirectionIcon from '../../../dist/icons/direction.svg'

const { padding, headerColor, fontFamily } = vars

let styles

export const TripItem = ({
  routeShortName,
  color = headerColor,
  textColor = '#fff',
  direction,
  trips = [],
}) => {
  if (trips.length === 0) return null
  return (
    <View style={[styles.wrapper, { backgroundColor: color }]}>
      <View>
        <Text style={[styles.routeShortName, { color: textColor }]}>
          {routeShortName}
        </Text>
        <View style={styles.destinations}>
          <View
            style={direction === 1 ? styles.direction : styles.directionRotated}
          >
            <DirectionIcon style={{ verticalAlign: 'top' }} />
          </View>
          <Text style={[styles.destination, { color: textColor }]}>
            {trips[0].destination}
          </Text>
        </View>
      </View>
    </View>
  )
}

styles = StyleSheet.create({
  wrapper: {
    paddingTop: padding * 0.375,
    paddingBottom: padding * 0.625,
    paddingLeft: padding * 0.75,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  routeShortName: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 'bold',
    fontFamily,
  },
  destinations: {
    flexDirection: 'row',
  },
  direction: {
    paddingTop: 4,
  },
  directionRotated: {
    transform: 'rotate(180deg)',
    paddingTop: 2,
  },
  destination: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: -0.5,
    fontFamily,
  },
})
