import React from 'react'
import { storiesOf } from '@storybook/react'

import { LineStopsRoute } from '../js/views/lines/stops/LineStopsRoute'

const stopData = [
  {
    stop_id: '8377',
    stop_name: 'Stokes Valley Terminus - Matt Grove',
    stop_lat: -41.193711,
    stop_lon: 174.984686,
    departure_time: '1970-01-01T11:37:00.000Z',
    stop_sequence: 0,
    transfers: [['120', '#008854']],
  },
  {
    stop_id: '8376',
    stop_name: 'Stokes Valley Road (near 482)',
    stop_lat: -41.190923,
    stop_lon: 174.983076,
    departure_time: '1970-01-01T11:57:37.000Z',
    stop_sequence: 1,
    transfers: [['120', '#008854']],
  },
  {
    stop_id: '8375',
    stop_name: 'Stokes Valley Road opposite Kamahi Street',
    stop_lat: -41.187978,
    stop_lon: 174.982844,
    departure_time: '1970-01-01T12:24:12.000Z',
    stop_sequence: 2,
    transfers: [['120', '#008854']],
  },
  {
    stop_id: '8375',
    stop_name: 'Stokes Valley Road opposite Jono Street',
    stop_lat: -41.187978,
    stop_lon: 174.982844,
    departure_time: '1970-01-01T12:56:12.000Z',
    stop_sequence: 3,
    transfers: [],
  },
  {
    stop_id: '8374',
    stop_name: 'Stokes Valley Road at Emelia Street (near 370)',
    stop_lat: -41.183481,
    stop_lon: 174.98247,
    departure_time: '1970-01-01T13:02:07.000Z',
    stop_sequence: 4,
    transfers: [['182', '#008854']],
  },
  {
    stop_id: '8373',
    stop_name: 'George Street at Stokes Valley Road (near 410)',
    stop_lat: -41.182679,
    stop_lon: 174.981969,
    departure_time: '1970-01-01T13:04:22.000Z',
    stop_sequence: 5,
    transfers: [['120', '#008854'], ['N22', '#000000']],
  },
]

storiesOf('LineStops', module)
  .add('from first stop', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="70"
      region="nz-akl"
    />
  ))
  .add('from alternate stop', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="70"
      region="nz-akl"
      selectedStop="8375"
    />
  ))
  .add('from last stop', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="70"
      region="nz-akl"
      selectedStop="8373"
    />
  ))
  .add('alternate color', () => (
    <LineStopsRoute
      stops={stopData}
      color="#22a6b3"
      line="70"
      region="nz-akl"
    />
  ))
  .add('alternate current line', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="120"
      region="nz-akl"
    />
  ))
  .add('realtime - 1 stop available', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="70"
      region="nz-akl"
      currentTrip="1"
      realtimeStopUpdates={{
        '1': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              stopSequence: 3,
              departure: {
                delay: -300,
              },
            },
          ],
        },
      }}
    />
  ))
  .add('realtime - multiple stops available', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="70"
      region="nz-akl"
      currentTrip="1"
      realtimeStopUpdates={{
        '1': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              stopSequence: 1,
              departure: {
                delay: -100,
              },
            },
            {
              scheduleRelationship: 'SCHEDULED',
              stopSequence: 2,
              departure: {
                delay: -200,
              },
            },
            {
              scheduleRelationship: 'SCHEDULED',
              stopSequence: 3,
              departure: {
                delay: -300,
              },
            },
          ],
        },
      }}
    />
  ))
  .add('with an extra block id', () => (
    <LineStopsRoute
      stops={stopData}
      color="#130f40"
      line="70"
      region="nz-akl"
      nextBlock={{
        trip_id: '1',
        route_id: '2',
        agency_id: 'NZB',
        route_short_name: 'T1',
        route_long_name: 'North Shore Line',
        route_color: '#f99e1c',
        route_text_color: '#ffffff',
        departure_time: new Date(
          new Date(stopData.slice(-1)[0].departure_time).getTime() + 600000
        ).toISOString(),
      }}
    />
  ))
