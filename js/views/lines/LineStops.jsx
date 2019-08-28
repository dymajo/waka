import React, { Fragment, useState } from 'react'
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native'

import { vars } from '../../styles.js'
import UiStore from '../../stores/UiStore.js'
import Transfers from './Transfers.jsx'

let styles = null // defined down below

export const LineStops = ({
  stops,
  color,
  line,
  region,
  currentTrip = '',
  selectedStop = null,
  realtimeStopUpdates = {},
}) => {
  const stopStyle = [styles.stop, { borderColor: color }]
  const [showAll, setShowAll] = useState(false)

  let selectedStopIndex = 0
  let afterSelectedStop = false
  if (selectedStop) {
    selectedStopIndex = stops.findIndex(a => a.stop_id === selectedStop)
  } else if (stops.length > 0) {
    afterSelectedStop = true
  }
  const comparisonStopTime = new Date(
    stops[selectedStopIndex].departure_time ||
      stops[selectedStopIndex].arrival_time
  )

  let realtimeStopUpdate
  const currentRealtimeTrip = realtimeStopUpdates[currentTrip]
  if (currentRealtimeTrip && currentRealtimeTrip.stopTimeUpdate) {
    realtimeStopUpdate = currentRealtimeTrip.stopTimeUpdate

    const goal = stops[selectedStopIndex].stop_sequence
    let delay = 0
    const closestUpdate = realtimeStopUpdate.reduce((prev, curr) => {
      return Math.abs(curr.stopSequence - goal) <
        Math.abs(prev.stopSequence - goal)
        ? curr
        : prev
    })

    const estimate = closestUpdate.departure || closestUpdate.arrival
    delay = estimate.delay
    comparisonStopTime.setTime(comparisonStopTime.getTime() + delay * 1000)
  }
  comparisonStopTime.setSeconds(0) // so it makes more sense in the UI

  return (
    <>
      {!showAll && selectedStopIndex > 0 ? (
        <TouchableOpacity
          onClick={() => setShowAll(true)}
          style={styles.previousWrapper}
        >
          <View style={styles.previousDots} />
          <View style={styles.previousTextWrapper}>
            <Text style={styles.previousText}>
              Show previous {selectedStopIndex} stops
            </Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <View style={styles.wrapper}>
        {stops.map((stop, index) => {
          if (selectedStop === stop.stop_id) {
            afterSelectedStop = true
          }
          if (!showAll && !afterSelectedStop) return null

          let delay = 0
          const goal = stop.stop_sequence
          if (realtimeStopUpdate) {
            const closestUpdate = realtimeStopUpdate.reduce((prev, curr) => {
              return Math.abs(curr.stopSequence - goal) <
                Math.abs(prev.stopSequence - goal)
                ? curr
                : prev
            })

            const estimate = closestUpdate.departure || closestUpdate.arrival
            delay = estimate.delay
          }

          const minutesOffset =
            Math.floor(
              (new Date(stop.departure_time).getTime() +
                delay * 1000 -
                comparisonStopTime) /
                60000 +
                1440
            ) % 1440

          return (
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
                onClick={() => UiStore.safePush(`/s/${region}/${stop.stop_id}`)}
              >
                <View style={styles.contentContainer}>
                  <Text style={styles.stopText}>{stop.stop_name}</Text>
                  <Transfers transfers={stop.transfers} currentLine={line} />
                </View>
                <View style={styles.timeContainer}>
                  <Text
                    style={
                      afterSelectedStop
                        ? styles.timeRelative
                        : [styles.timeRelative, styles.timePast]
                    }
                  >
                    {afterSelectedStop
                      ? `+${minutesOffset}`
                      : `${minutesOffset - 1440}`}{' '}
                    mins
                  </Text>
                  <Text
                    style={
                      afterSelectedStop
                        ? styles.timeAbsolute
                        : [styles.timeAbsolute, styles.timePast]
                    }
                  >
                    {new Date(
                      new Date(
                        stop.departure_time || stop.arrival_time
                      ).getTime() +
                        delay * 1000
                    ).toLocaleTimeString(navigator.language, {
                      timeZone: 'UTC',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
    </>
  )
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
  previousWrapper: {
    flexDirection: 'row',
  },
  previousDots: {
    width: 5,
    height: 15,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: vars.padding,
    backgroundColor: 'rgba(0,0,0,0.25)',
    boxShadow: '0 5px 0 rgba(0,0,0,0.25), 0 -5px 0 rgba(0,0,0,0.25)',
    borderTopWidth: 5,
    borderTopStyle: 'solid',
    borderTopColor: '#fff',
    borderBottomWidth: 5,
    borderBottomStyle: 'solid',
    borderBottomColor: '#fff',
  },
  previousTextWrapper: {
    marginLeft: vars.padding * 0.75,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: vars.padding * 0.375,
    marginTop: vars.padding * 0.375,
    borderRadius: 3,
    paddingLeft: vars.padding * 0.375,
    paddingRight: vars.padding * 0.375,
    paddingTop: 2,
    paddingBottom: 2,
  },
  previousText: {
    fontFamily,
    fontWeight: '600',
    color: vars.headerColor,
    fontSize: 13,
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
  timePast: {
    color: '#666',
  },
})
