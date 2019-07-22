import React from 'react'
import { storiesOf } from '@storybook/react'

import { TripItem } from '../js/views/station/TripItemV2.jsx'

storiesOf('TripItem', module)
  .add('single trip', () => (
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
  .add('5 minutes away', () => (
    <TripItem
      routeShortName="70"
      direction={0}
      trips={[
        {
          destination: 'Botany',
          departureTime: new Date(new Date().getTime() + 1000 * 60 * 5),
          isRealtime: false,
        },
      ]}
    />
  ))
  .add('1 hour away', () => (
    <TripItem
      routeShortName="70"
      direction={0}
      trips={[
        {
          destination: 'Botany',
          departureTime: new Date(new Date().getTime() + 1000 * 60 * 60),
          isRealtime: false,
        },
      ]}
    />
  ))
  .add('1.5 hours away', () => (
    <TripItem
      routeShortName="70"
      direction={0}
      trips={[
        {
          destination: 'Botany',
          departureTime: new Date(new Date().getTime() + 1000 * 60 * 90),
          isRealtime: false,
        },
      ]}
    />
  ))
  .add('3 hours away', () => (
    <TripItem
      routeShortName="70"
      direction={0}
      trips={[
        {
          destination: 'Botany',
          departureTime: new Date(new Date().getTime() + 1000 * 60 * 180),
          isRealtime: false,
        },
      ]}
    />
  ))
  .add('two trips', () => (
    <TripItem
      routeShortName="70"
      direction={0}
      trips={[
        {
          destination: 'Botany',
          departureTime: new Date(),
          isRealtime: false,
        },
        {
          destination: 'Botany',
          departureTime: new Date(new Date().getTime() + 1000 * 60 * 5),
          isRealtime: false,
        },
      ]}
    />
  ))
