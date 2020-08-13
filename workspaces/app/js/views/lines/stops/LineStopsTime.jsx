import React from 'react'
import { Text, View, StyleSheet } from 'react-native'

import { vars } from '../../../styles.js'

const { fontFamily, padding } = vars
const styles = StyleSheet.create({
  timeContainer: {
    paddingTop: padding / 2,
    paddingBottom: padding / 2,
    paddingLeft: padding * 0.75,
  },
  timeRelative: {
    fontFamily,
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '600',
  },
  timeAbsolute: {
    fontFamily,
    fontSize: 13,
    textAlign: 'right',
  },
  timePast: {
    color: '#666',
  },
})

const LineStopsTime = ({
  afterSelectedStop,
  isTwentyFourHour,
  departureTime,
  comparisonTime,
}) => {
  const minutesOffset =
    Math.floor((departureTime - comparisonTime) / 60000 + 1440) % 1440

  return (
    <View style={styles.timeContainer}>
      <Text
        style={
          afterSelectedStop
            ? styles.timeRelative
            : [styles.timeRelative, styles.timePast]
        }
      >
        {afterSelectedStop ? `+${minutesOffset}` : `${minutesOffset - 1440}`}{' '}
        mins
      </Text>
      <Text
        style={
          afterSelectedStop
            ? styles.timeAbsolute
            : [styles.timeAbsolute, styles.timePast]
        }
      >
        {new Date(departureTime).toLocaleTimeString(navigator.language, {
          timeZone: 'UTC',
          hour12: !isTwentyFourHour,
          hour: 'numeric',
          minute: 'numeric',
        })}
      </Text>
    </View>
  )
}
export default LineStopsTime
