import React from 'react'
import PropTypes from 'prop-types'
import { View, StyleSheet } from 'react-native-web'

'EMPTY' |
  'MANY_SEATS_AVAILABLE' |
  'FEW_SEATS_AVAILABLE' |
  'STANDING_ROOM_ONLY' |
  'CRUSHED_STANDING_ROOM_ONLY' |
  'FULL'
function congestionToColor(congestion) {
  switch (congestion) {
  case 'EMPTY':
    return 'green'
  case 'MANY_SEATS_AVAILABLE':
    return 'green'
  case 'FEW_SEATS_AVAILABLE':
    return 'yellow'
  case 'STANDING_ROOM_ONLY':
    return 'orange'
  case 'CRUSHED_STANDING_ROOM_ONLY':
    return 'red'
  case 'FULL':
    return 'darkred'

  default:
    break
  }
}
const Consist = ({ consist }) => {
  if (consist) {
    if (consist.length === 1) {
      const single = consist[0]
      const color = congestionToColor(single.occupancyStatus)

      return (
        <View style={styles.consist}>
          <View style={[styles.middle, { backgroundColor: color }]} />
          <View style={[styles.middle, { backgroundColor: color }]} />
          <View style={[styles.middle, { backgroundColor: color }]} />
          <View style={[styles.middle, { backgroundColor: color }]} />
          <View style={[styles.front, { backgroundColor: color }]} />
        </View>
      )
    }
    if (consist.length > 1) {
      const front = consist[0]

      return (
        <View style={styles.consist}>
          {consist
            .slice(1)
            .reverse()
            .map(c => (
              <View style={styles.middle} />
            ))}
          <View style={styles.front} />
        </View>
      )
    }
  }
  return <div />
}

Consist.propTypes = {}

const styles = StyleSheet.create({
  single: {
    width: '100px',
    height: '20px',
    borderColor: 'black',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderTopRightRadius: '16px',
  },
  front: {
    width: '20px',
    height: '20px',
    borderColor: 'black',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderTopRightRadius: '16px',
  },
  middle: {
    width: '20px',
    height: '20px',
    borderColor: 'black',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  consist: {
    display: 'flex',
    flexDirection: 'row',
  },
})

export default Consist
