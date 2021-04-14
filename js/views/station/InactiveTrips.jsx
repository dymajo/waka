import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { TripItem } from './TripItemV2.jsx'
import { vars } from '../../styles'
import ChevronDown from '../../../dist/icons/chevron-down.svg'

const { padding, fontFamily, defaultFontSize, headerColor, borderColor } = vars

const styles = StyleSheet.create({
  header: {
    paddingLeft: padding,
    paddingRight: padding,
    paddingTop: padding / 2,
    paddingBottom: padding / 2,
    backgroundColor: '#fff',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: borderColor,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: borderColor,
    display: 'flex',
    flexDirection: 'row',
  },
  headerText: {
    color: headerColor,
    fontFamily,
    fontWeight: '600',
    fontSize: defaultFontSize - 2,
    lineHeight: 24,
    flex: 1,
  },
  icon: {
    transform: 'rotate(-180deg)',
  },
  flex: {
    flex: 1,
  },
})

export const InactiveTrips = ({ routes, onClick, region }) => {
  const [isExpanded, setExpanded] = useState(false)
  return (
    <View>
      <View style={styles.flex}></View>
      {routes.length > 0 ? (
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded(!isExpanded)}
        >
          <Text style={styles.headerText}>Inactive Lines</Text>
          <View style={isExpanded ? styles.icon : null}>
            <ChevronDown />
          </View>
        </TouchableOpacity>
      ) : null}
      {isExpanded
        ? routes.map(route => {
            const {
              route_id: routeId,
              agency_id: agencyId,
              route_short_name: routeShortName,
              direction_id: directionId,
              route_color: routeColor,
              route_text_color: routeTextColor,
              stop_id: stopId,
            } = route
            return (
              <TripItem
                key={routeId}
                routeShortName={routeShortName}
                direction={directionId}
                color={routeColor}
                textColor={routeTextColor}
                region={region}
                trips={[
                  {
                    destination: route.trip_headsign,
                    departureTime: null,
                  },
                ]}
                onClick={() =>
                  onClick(
                    agencyId,
                    routeId,
                    routeShortName,
                    directionId,
                    null,
                    stopId
                  )
                }
              />
            )
          })
        : null}
    </View>
  )
}
