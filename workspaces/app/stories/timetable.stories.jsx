import React from 'react'
import { storiesOf } from '@storybook/react'
import LineTimetableSelector from '../js/views/lines/timetable/LineTimetableSelector'

const now = new Date().toISOString()
const tenMins = new Date(new Date(now).getTime() + 10 * 60000).toISOString()
const hour = new Date(new Date(now).getTime() + 60 * 60000).toISOString()
const past = new Date(new Date(now).getTime() - 10 * 60000).toISOString()

storiesOf('Timetable', module)
  .add('1 trip', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[{ trip_id: '1', departure_time: now, visible: true }]}
      realtimeStopUpdates={{}}
      triggerTrip={() => {}}
    />
  ))
  .add('2 trips', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
      ]}
      realtimeStopUpdates={{}}
      triggerTrip={() => {}}
    />
  ))
  .add('3 trips', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{}}
      triggerTrip={() => {}}
    />
  ))
  .add('selected trip', () => (
    <LineTimetableSelector
      currentTrip="2"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{}}
      triggerTrip={() => {}}
    />
  ))
  .add('realtime - cancelled', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{
        '1': { stopTimeUpdate: [{ scheduleRelationship: 'CANCELLED' }] },
        '2': { stopTimeUpdate: [{ scheduleRelationship: 'CANCELLED' }] },
      }}
      triggerTrip={() => {}}
    />
  ))
  .add('realtime - late', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{
        '1': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              departure: {
                delay: 290,
              },
            },
          ],
        },
        '2': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              departure: {
                delay: 290,
              },
            },
          ],
        },
      }}
      triggerTrip={() => {}}
    />
  ))
  .add('realtime - on time', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{
        '1': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              departure: {
                delay: -60,
              },
            },
          ],
        },
        '2': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              departure: {
                delay: 60,
              },
            },
          ],
        },
      }}
      triggerTrip={() => {}}
    />
  ))
  .add('realtime - early', () => (
    <LineTimetableSelector
      currentTrip="1"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{
        '1': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              departure: {
                delay: -600,
              },
            },
          ],
        },
        '2': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              departure: {
                delay: -300,
              },
            },
          ],
        },
      }}
      triggerTrip={() => {}}
    />
  ))
  .add('realtime - very late', () => (
    <LineTimetableSelector
      currentTrip="0"
      timetable={[
        {
          trip_id: '0',
          departure_time: past,
          visible: false,
          stopSequence: 15,
        },
        { trip_id: '1', departure_time: now, visible: true },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{
        '0': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              stopSequence: 10,
              departure: {
                delay: 900,
              },
            },
          ],
        },
      }}
      triggerTrip={() => {}}
    />
  ))
  .add('realtime - very early', () => (
    <LineTimetableSelector
      currentTrip="2"
      timetable={[
        { trip_id: '1', departure_time: now, visible: true, stopSequence: 15 },
        { trip_id: '2', departure_time: tenMins, visible: true },
        { trip_id: '3', departure_time: hour, visible: true },
      ]}
      realtimeStopUpdates={{
        '1': {
          stopTimeUpdate: [
            {
              scheduleRelationship: 'SCHEDULED',
              stopSequence: 20,
              departure: {
                delay: -300,
              },
            },
          ],
        },
      }}
      triggerTrip={() => {}}
    />
  ))
