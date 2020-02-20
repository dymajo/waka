import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { TripItem } from './TripItemV2.jsx'
import { vars } from '../../styles'

const { padding, fontFamily, borderColor } = vars

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
  },
  headerText: {
    fontFamily,
    fontWeight: '600',
  },
})

export const InactiveTrips = ({ routes, onClick, region }) => (
  <View>
    {routes.length > 0 ? (
      <View style={styles.header}>
        <Text style={styles.headerText}>Inactive Routes</Text>
      </View>
    ) : null}
    {routes.map(route => {
      const {
        route_id: routeId,
        agency_id: agencyId,
        route_short_name: routeShortName,
        direction_id: directionId,
        route_color: routeColor,
        route_text_color: routeTextColor,
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
            onClick(agencyId, routeId, routeShortName, directionId)
          }
        />
      )
    })}
  </View>
)
