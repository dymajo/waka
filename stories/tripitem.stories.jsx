import React from 'react'
import { storiesOf } from '@storybook/react'

import { TripItem } from '../js/views/station/TripItemV2.jsx'

storiesOf('TripItem', module).add('single trip', () => (
  <React.Fragment>
    <TripItem
      routeShortName="70"
      direction={0}
      trips={[
        { destination: 'Botany', departureTime: new Date(), isRealtime: false },
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
