import React from 'react'
import { storiesOf } from '@storybook/react'
import Timetable from '../js/views/lines/Timetable'

storiesOf('timetable', module).add('2 trips', () => (
  <Timetable
    currentTrip="1"
    timetable={[
      { trip_id: '1', departure_time: 1 },
      { trip_id: '2', departure_time: 2000 },
    ]}
    triggerTrip={() => {}}
  />
))
