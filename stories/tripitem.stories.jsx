import React from 'react'
import { storiesOf } from '@storybook/react'

import { TripItem } from '../js/views/station/TripItemV2.jsx'
import SettingsStore from '../js/stores/SettingsStore.js'

const singleTrip = {
  destination: 'Botany',
  departureTime: new Date(),
  isRealtime: false,
}

storiesOf('TripItem', module)
  .add('single trip', () => (
    <>
      <TripItem routeShortName="70" direction={0} trips={[singleTrip]} />
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
