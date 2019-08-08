import React from 'react'
import PropTypes from 'prop-types'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'

import { vars } from '../../styles.js'
import UiStore from '../../stores/UiStore.js'
import Transfers from './Transfers.jsx'

let styles = null // defined down below

class LineStops extends React.PureComponent {
  static propTypes = {
    stops: PropTypes.array.isRequired,
    color: PropTypes.string.isRequired,
    line: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
  }

  triggerClick(stopCode, mode) {
    return () => {
      const { line, region } = this.props
      const baseUrl = `/s/${region}/${stopCode}`
      if (mode === 'timetable') {
        UiStore.safePush(`${baseUrl}/timetable/${line}-2`)
      } else {
        UiStore.safePush(baseUrl)
      }
    }
  }

  render() {
    const { color, stops, line } = this.props
    const stopStyle = [styles.stop, { borderColor: color }]
    let comparisionStop
    if (stops.length > 0) {
      comparisionStop = new Date(stops[0].departure_time)
    }
    return (
      <View style={styles.wrapper}>
        {stops.map((stop, index) => (
          <View style={stopStyle} key={stop.stop_sequence}>
            {index === 0 ? (
              <View style={styles.bulletWrapper}>
                <View style={styles.bulletFake} />
                <View style={styles.bulletSpacing} />
              </View>
            ) : index === stops.length - 1 ? (
              <View style={styles.bulletWrapper}>
                <View style={styles.bulletSpacing} />
                <View style={styles.bulletFake} />
              </View>
            ) : null}
            <View style={styles.bullet} />

            <TouchableOpacity
              style={
                index === stops.length - 1
                  ? [styles.controls, { borderBottomWidth: 0 }]
                  : styles.controls
              }
              onClick={this.triggerClick(stop.stop_id, 'services')}
            >
              <View style={styles.contentContainer}>
                <Text style={styles.stopText}>{stop.stop_name}</Text>
                <Transfers transfers={stop.transfers} currentLine={line} />
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeRelative}>
                  +
                  {Math.round(
                    (new Date(stop.departure_time) - comparisionStop) / 60000 +
                      1440
                  ) % 1440}{' '}
                  mins
                </Text>
                <Text style={styles.timeAbsolute}>
                  {new Date(stop.departure_time).toLocaleTimeString(
                    navigator.language,
                    {
                      timeZone: 'UTC',
                      hour: 'numeric',
                      minute: 'numeric',
                    }
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    )
  }
}

const { fontFamily } = vars
styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    borderColor: vars.borderColor,
  },
  stop: {
    marginLeft: vars.padding,
    borderLeftWidth: 5,
    borderLeftStyle: 'solid',
    borderColor: '#666',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bulletWrapper: {
    flexDirection: 'column',
    marginLeft: -5,
  },
  bulletFake: {
    borderLeftWidth: 5,
    borderLeftStyle: 'solid',
    borderLeftColor: '#fff',
    flex: 1,
  },
  bullet: {
    borderTopWidth: 5,
    borderTopStyle: 'solid',
    borderTopColor: 'inherit',
    width: 10,
    marginTop: 'auto',
    marginBottom: 'auto',
    marginRight: vars.padding * 0.75,
    marginLeft: -5,
  },
  bulletSpacing: {
    flex: 1,
  },
  controls: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: vars.borderColorWhite,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: vars.padding,
  },
  contentContainer: {
    paddingBottom: vars.padding * 0.5,
    flex: 1,
  },
  stopText: {
    flex: 1,
    fontSize: vars.defaultFontSize - 1,
    fontFamily,
    paddingTop: vars.padding * 0.75,
    paddingBottom: vars.padding * 0.25,
  },
  timeContainer: {
    paddingTop: vars.padding / 2,
    paddingBottom: vars.padding / 2,
    paddingLeft: vars.padding * 0.75,
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
})

export default LineStops
