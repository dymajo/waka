import React from 'react'
import { storiesOf } from '@storybook/react'

import { TripItem } from '../js/views/station/TripItemV2.jsx'
import SettingsStore from '../js/stores/SettingsStore.js'

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
  .add('single trip', () => (
    <>
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
    </>
  ))
  .add('two trips', () => (
    <>
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
    </>
  ))
  .add('three+ trips - mins + variants', () => (
    <>
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
    </>
  ))
  .add('three+ trips - hour + variants', () => (
    <>
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
    </>
  ))
  .add('three+ trips - hours & mins + variants', () => (
    <>
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
    </>
  ))
  .add('three+ trips - text + variants', () => (
    <>
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
    </>
  ))
  .add('multiple directions', () => (
    <React.Fragment>
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
    </React.Fragment>
  ))
  .add('background colors', () => (
    <React.Fragment>
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
    </React.Fragment>
  ))
  .add('foreground colors', () => (
    <React.Fragment>
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
    </React.Fragment>
  ))
