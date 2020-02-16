import { endpoint } from '../../local'
import { t } from '../stores/translationStore.js'

class StationData {
  offsetTime = 0

  getStationInfo = async (region, stopCode) => {
    // if it's a multi-stop, just return something made up
    if (stopCode.split('+').length > 1) {
      return {
        stopId: stopCode,
        name: t('savedStations.multi'),
        description: t('savedStations.stops', {
          number: stopCode.split('+').join(', '),
        }),
        routeType: 0,
        stopLat: 0,
        stopLon: 0,
        zone: null,
        lines: null,
      }
    }

    const res = await fetch(`${endpoint}/${region}/station/${stopCode}`)
    if (res.status >= 400) {
      throw new Error(res.status.toString())
    }
    const data = await res.json()

    const stopId = data.stop_id
    let name = data.stop_name
    const routeType = data.route_type
    const stopLat = data.stop_lat
    const stopLon = data.stop_lon
    const zone = data.zone_id
    const { lines } = data
    let description = data.stop_desc

    if (description == null) {
      if (routeType === 3) {
        description = `${t('station.bus')} ${stopId}`
      } else {
        description = data.stop_name
      }

      // if we've used the name of the stop as the description
      // remove randomo words
      name = name.replace(/(Interchange|Bus Station)/, ' -')
      name = name.replace(
        /( |- )(Carpark|Train Station|Ferry Terminal|Cable Car Station)/,
        ''
      )
    }

    return {
      stopId,
      name,
      description,
      routeType,
      stopLat,
      stopLon,
      zone,
      lines,
    }
  }

  getStationTimes = async (region, stopCode) => {
    if (!navigator.onLine) {
      throw new Error(t('app.nointernet'))
    }
    const res = await fetch(`${endpoint}/${region}/station/${stopCode}/times`)
    if (res.status >= 400) {
      throw new Error(res.status.toString())
    }
    const data = await res.json()
    this.setOffset(data.currentTime)
    return data
  }

  setOffset(time) {
    const offsetTime = new Date()
    offsetTime.setHours(0)
    offsetTime.setMinutes(0)
    offsetTime.setSeconds(0)
    offsetTime.setSeconds(time)
    this.offsetTime = offsetTime.getTime() - new Date().getTime()

    // essentially ignores timezones
    // and it doesn't matter cause you're not waiting for a bus anyway
    if (Math.abs(this.offsetTime) > 600000) {
      this.offsetTime = 0
    }
  }

  getRealtimeTrips = async (region, tripData, stopCode = null) => {
    if (tripData.length === 0) {
      return {}
    }

    // only gets realtime info for things +1 hrs away
    const queryString = tripData
      .filter(
        trip =>
          new Date(trip.departure_time).getTime() <
          new Date().getTime() + 3600000
      )
      .map(trip => trip.trip_id)

    // now we do a request to the realtime API
    const res = await fetch(`${endpoint}/${region}/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stop_id: stopCode,
        trips: queryString,
      }),
    })
    if (res.status >= 400) {
      throw new Error(res.status.toString())
    }
    const data = await res.json()
    return data
  }

  reduceTrips = (data, realtimeData = {}) => {
    const reducer = new Map()
    data.forEach(trip => {
      if (trip.stop_sequence === undefined) return

      // this is so the route_numbers group together
      const uniqueKey = [trip.route_short_name, trip.agency_id].join('-')
      if (!reducer.has(uniqueKey)) {
        reducer.set(uniqueKey, new Map())
      }

      // this is so all the same routes group together
      const via = trip.route_long_name.split('via')[1] || ''
      const uniqueTripKey = [
        trip.route_short_name,
        trip.trip_headsign,
        trip.agency_id,
        via,
        trip.direction_id,
      ].join('-')
      if (!reducer.get(uniqueKey).has(uniqueTripKey)) {
        reducer.get(uniqueKey).set(uniqueTripKey, [])
      }

      // This allows buses to be two minutes late, and still show on the app.
      let tolerance = 1000 * 60 * 2
      trip.realtime_departure_time = trip.departure_time
      if (realtimeData[trip.trip_id] !== undefined) {
        const realtimeTrip = realtimeData[trip.trip_id]
        trip.realtime_departure_time = new Date(
          new Date(trip.departure_time).getTime() +
            (realtimeTrip.delay || 0) * 1000
        ).toISOString()
        trip.isRealtime = true

        // it's still realtime if it's a random stop sequence, so tighten the tolerance up a bit
        if (
          realtimeTrip.stop_sequence === -100 ||
          trip.stop_sequence - realtimeTrip.stop_sequence === 0
        ) {
          tolerance = 1000 * 60
          // maybe need to ensure it's due?
        } else if (trip.stop_sequence - realtimeTrip.stop_sequence < 0) {
          // departed
          return
        }
      } else {
        trip.isRealtime = false
      }

      const offsetTime = new Date().getTime() + this.offsetTime
      if (
        new Date(trip.realtime_departure_time) <
        new Date(offsetTime - tolerance)
      ) {
        return
      }

      // adds the trip to the group
      reducer
        .get(uniqueKey)
        .get(uniqueTripKey)
        .push(trip)
    })

    const tripGroups = []
    reducer.forEach(tripGroup => {
      const sortedGroup = []
      tripGroup.forEach(tripVariant => {
        if (tripVariant.length === 0) return
        sortedGroup.push(
          tripVariant.sort((a, b) => {
            return (
              new Date(a.realtime_departure_time) -
              new Date(b.realtime_departure_time)
            )
          })
        )
      })
      // sorts each group by the one that is probably not finishing up
      // then, by departure time
      if (sortedGroup.length === 0) return
      sortedGroup.sort((a, b) => {
        const stopSequenceDifference = a[0].stop_sequence - b[0].stop_sequence
        if (stopSequenceDifference !== 0) return stopSequenceDifference
        return (
          new Date(a[0].realtime_departure_time) -
          new Date(b[0].realtime_departure_time)
        )
      })
      tripGroups.push(sortedGroup)
    })

    // sorts each of the groups by time, then flattens
    const trips = tripGroups
      .sort((a, b) => {
        return (
          new Date(a[0][0].realtime_departure_time) -
          new Date(b[0][0].realtime_departure_time)
        )
      })
      .reduce((acc, val) => acc.concat(val), [])

    return trips
  }
}
export default StationData
