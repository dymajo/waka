import React from 'react'
import { View, Text } from 'react-native'
import { TripItem } from './TripItemV2.jsx'

export const InactiveTrips = ({ routes, onClick, region }) => (
  <View>
    {routes.length > 0 ? <Text>Inactive Routes:</Text> : null}
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
              departureTime: new Date(),
              isRealtime: false,
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
