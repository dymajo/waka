import React, { Fragment } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native-web'
import { vars } from '../../styles.js'

import DirectionIcon from '../../../dist/icons/direction.svg'

const { padding, headerColor, fontFamily } = vars

let styles

const getTime = (date, isTwentyFourHour, showDue) => {
  const now = new Date()
  if (date <= now) {
    if (showDue === true) {
      return {
        text: 'Due',
      }
    }
    return {
      minutes: '0', // hack - using a string is != false
    }
  }
  const minutes = Math.ceil((date.getTime() - now.getTime()) / 60000)
  if (minutes >= 180) {
    // be careful using 'default' as it will use browser default time formatting
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString#Using_locales
    const dateText = date.toLocaleTimeString('default', {
      // get 24h time from settings
      hour12: !isTwentyFourHour,
      hour: 'numeric',
      minute: 'numeric',
    })
    // if us -> AM/PM, if au/nz -> am/pm, if gb -> 24h
    return {
      text: dateText.replace(/ (AM|PM|am|pm)/, ''),
      subtext: dateText.match(/ (AM|PM|am|pm)/)
        ? dateText.match(/ (AM|PM|am|pm)/)[0].toLowerCase()
        : null,
    }
  }
  if (minutes >= 60) {
    return {
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    }
  }
  return {
    minutes,
  }
}

// this is called recursively, with options to make it look good
const getNextText = (times, hideVerb = false, amphersand = 'also') => {
  const time = times[0]
  const time2 = times[1]

  let combinedMinutes = false
  if (times.length > 1) {
    combinedMinutes =
      times[0].minutes !== undefined &&
      times[1].minutes !== undefined &&
      times[0].hours === undefined &&
      times[1].hours === undefined
  }
  return (
    <>
      {amphersand ? ` ${amphersand}` : null}
      {hideVerb ? null : time.text ? ' at' : ' in'}
      {time.text ? (
        <>
          &nbsp;
          <Text style={styles.strong}>{time.text}</Text>
          {time.subtext}
        </>
      ) : null}
      {time.hours ? (
        <>
          &nbsp;
          <Text style={styles.strong}>{time.hours}</Text>
          &nbsp;hr
        </>
      ) : null}
      {time.minutes ? (
        <>
          &nbsp;
          <Text style={styles.strong}>
            {time.minutes}
            {combinedMinutes ? `, ${time2.minutes}` : null}
          </Text>
          &nbsp;{time.minutes === 1 ? 'min' : 'mins'}
        </>
      ) : null}
      {!combinedMinutes && time2 !== undefined ? (
        <>
          ,
          {getNextText(
            [time2],
            time2.text === undefined || time.text !== undefined,
            time2.text === undefined || time.text !== undefined ? false : 'and'
          )}
        </>
      ) : null}
    </>
  )
}

export const TripItem = ({
  routeShortName,
  color = headerColor,
  textColor = '#fff',
  direction,
  isTwentyFourHour = false,
  trips = [],
}) => {
  if (trips.length === 0) return null
  const textColorStyles = {
    color: textColor,
  }

  const mainDepartureTime = getTime(
    trips[0].departureTime,
    isTwentyFourHour,
    true
  )
  const secondaryDepartureTime = trips
    .slice(1, 3)
    .map(i => getTime(i.departureTime, isTwentyFourHour, false))
  return (
    <TouchableOpacity activeOpacity={0.75}>
      <View style={[styles.wrapper, { backgroundColor: color }]}>
        <View style={styles.left}>
          <Text style={[styles.routeShortName, textColorStyles]}>
            {routeShortName}
          </Text>
          <View style={styles.destinations}>
            <View
              style={
                direction === 1 ? styles.direction : styles.directionRotated
              }
            >
              <DirectionIcon
                style={{ verticalAlign: 'top', fill: textColor }}
              />
            </View>
            <Text style={[styles.destination, textColorStyles]}>
              {trips[0].destination}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.right,
            {
              backgroundImage: trips[0].isRealtime
                ? 'url("/icons/realtime.svg")'
                : '',
              backgroundPosition: mainDepartureTime.text
                ? 'calc(100% - 3px) 2px'
                : 'calc(100% - 3px) 7px',
            },
          ]}
        >
          <Text
            style={[
              styles.departureTime,
              {
                color: textColor,
                opacity: trips[0].isRealtime ? 1 : 0.8,
              },
            ]}
          >
            {mainDepartureTime.text ? (
              <Text style={styles.departureTimeText}>
                {mainDepartureTime.text}
              </Text>
            ) : null}
            {mainDepartureTime.subtext ? (
              <Text style={styles.departureTimeUnit}>
                {mainDepartureTime.subtext}
              </Text>
            ) : null}
            {mainDepartureTime.hours ? (
              <Fragment>
                <Text style={styles.departureTimeLarge}>
                  {mainDepartureTime.hours}
                </Text>
                <Text style={styles.departureTimeUnit}>hr</Text>
              </Fragment>
            ) : null}
            {mainDepartureTime.minutes ? (
              <Fragment>
                <Text style={styles.departureTimeLarge}>
                  &nbsp;{mainDepartureTime.minutes}
                </Text>
                <Text style={styles.departureTimeUnit}>m</Text>
              </Fragment>
            ) : null}
          </Text>
          {trips.length === 1 ? (
            <Text
              style={[
                styles.last,
                { ...textColorStyles, borderColor: textColor },
              ]}
            >
              Last
            </Text>
          ) : (
            <Text style={[styles.and, textColorStyles]}>
              {getNextText(secondaryDepartureTime)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    flex: 1,
  },
  right: {
    paddingRight: padding * 0.75,
    display: 'block',
    textAlign: 'right',
    backgroundRepeat: 'no-repeat',
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
  departureTime: {
    display: 'block',
    fontWeight: 'bold',
    fontSize: 18,
    paddingRight: 1,
    fontFamily,
  },
  departureTimeText: {
    lineHeight: 28,
  },
  departureTimeLarge: {
    fontSize: 24,
  },
  departureTimeUnit: {
    fontSize: 14,
  },
  last: {
    display: 'inline-block',
    textTransform: 'uppercase',
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: padding * 0.25,
    paddingRight: padding * 0.25,
    fontSize: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.5)',
    opacity: 0.7,
    marginTop: 1,
    letterSpacing: 0.5,
    color: '#fff',
    fontFamily,
  },
  strong: {
    fontWeight: 'bold',
  },
})
