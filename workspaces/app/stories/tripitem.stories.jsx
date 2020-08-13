import React from 'react'
import { storiesOf } from '@storybook/react'
import { View } from 'react-native'

import { TripItem } from '../js/views/station/TripItemV2.jsx'

const singleTrip = {
  destination: 'Botany',
  departureTime: new Date(new Date().getTime() + 1000 * 60 * 2),
  isRealtime: false,
}
const houredTrip = {
  ...singleTrip,
  departureTime: new Date(new Date().getTime() + 1000 * 60 * 60),
}
const hoursTrip = {
  ...singleTrip,
  departureTime: new Date(new Date().getTime() + 1000 * 60 * 80),
}

storiesOf('TripItem', module)
  .add('no trip', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem routeShortName="70" direction={0} trips={[]} />
    </View>
  ))
  .add('null trip', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[{ ...singleTrip, departureTime: null }]}
      />
    </View>
  ))
  .add('single trip', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[{ ...singleTrip, departureTime: new Date() }]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 5),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 60),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 90),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
    </View>
  ))
  .add('two trips', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[singleTrip, singleTrip]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 5),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 60),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 61),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 90),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
    </View>
  ))
  .add('three+ trips - mins + variants', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[singleTrip, singleTrip, singleTrip]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 5),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 60),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 61),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 90),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          singleTrip,
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
    </View>
  ))
  .add('three+ trips - hour + variants', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[singleTrip, houredTrip, houredTrip]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          houredTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 90),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          houredTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          singleTrip,
          houredTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
    </View>
  ))
  .add('three+ trips - hours & mins + variants', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[singleTrip, hoursTrip, hoursTrip]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          hoursTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 90),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          hoursTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          singleTrip,
          hoursTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
    </View>
  ))
  .add('three+ trips - text + variants', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 320),
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        isTwentyFourHour
        trips={[
          singleTrip,
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          },
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 320),
          },
        ]}
      />
    </View>
  ))
  .add('multiple directions', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          {
            destination: 'Botany',
            departureTime: new Date(),
            isRealtime: false,
          },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={1}
        trips={[
          {
            destination: 'Britomart',
            departureTime: new Date(),
            isRealtime: false,
          },
        ]}
      />
    </View>
  ))
  .add('background colors', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        color="rgb(7, 89, 176)"
        trips={[
          {
            destination: 'Botany',
            departureTime: new Date(),
            isRealtime: false,
          },
        ]}
      />
      <TripItem
        routeShortName="NX2"
        direction={0}
        color="rgb(0, 133, 64)"
        trips={[
          {
            destination: 'Britomart',
            departureTime: new Date(),
            isRealtime: false,
          },
        ]}
      />
    </View>
  ))
  .add('foreground colors', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="EAST"
        direction={0}
        color="#f9ca24"
        textColor="rgba(0,0,0,0.85)"
        trips={[
          {
            destination: 'Botany',
            departureTime: new Date(),
            isRealtime: false,
          },
        ]}
      />
      <TripItem
        routeShortName="EAST"
        direction={1}
        color="#f9ca24"
        textColor="rgba(0,0,0,0.85)"
        trips={[
          {
            destination: 'Britomart',
            departureTime: new Date(),
            isRealtime: false,
          },
          singleTrip,
        ]}
      />
    </View>
  ))
  .add('platform codes', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="EAST"
        direction={0}
        color="#f9ca24"
        textColor="rgba(0,0,0,0.85)"
        trips={[
          {
            destination: 'Botany',
            departureTime: new Date(),
            isRealtime: false,
            platform: '2',
          },
        ]}
      />
      <TripItem
        routeShortName="EAST"
        direction={1}
        color="#f9ca24"
        textColor="rgba(0,0,0,0.85)"
        trips={[
          {
            destination: 'Britomart',
            departureTime: new Date(),
            isRealtime: false,
            platform: '3',
          },
          singleTrip,
        ]}
      />
    </View>
  ))
  .add('realtime', () => (
    <View style={{ backgroundColor: '#000' }}>
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[{ ...singleTrip, departureTime: new Date(), isRealtime: true }]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[{ ...singleTrip, isRealtime: true }]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          { ...singleTrip, isRealtime: true },
          { ...houredTrip, isRealtime: true },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          { ...singleTrip, isRealtime: true },
          { ...houredTrip, isRealtime: true },
          { ...hoursTrip, isRealtime: true },
        ]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[{ ...hoursTrip, isRealtime: true }]}
      />
      <TripItem
        routeShortName="70"
        direction={0}
        trips={[
          {
            ...singleTrip,
            departureTime: new Date(new Date().getTime() + 1000 * 60 * 320),
            isRealtime: true,
          },
        ]}
      />
    </View>
  ))
