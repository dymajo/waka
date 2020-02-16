import local from '../../local'

class LineData {
  constructor(props) {
    this.region = props.region || null
    this.route_short_name = props.route_short_name || null
    this.agency_id = props.agency_id || null
    this.shape_id = props.shape_id || null
    this.trip_id = props.trip_id || null
    this.route_id = props.route_id || null
    this.stop_id = props.stop_id || null
    this.direction_id = props.direction_id || 0
    this.realtime_trips = props.realtime_trips || []
  }

  async getLines() {
    if (this.region === null) {
      throw new Error('Requires region to be set.')
    }
    try {
      const res = await fetch(`${local.endpoint}/${this.region}/all-lines`)
      const data = await res.json()
      return data
    } catch (error) {
      throw error
    }
  }

  async getMeta() {
    if (
      this.region === null ||
      this.route_short_name === null ||
      this.agency_id === null
    ) {
      throw new Error(
        'Requires both region, route_short_name, and agency_id to be set.'
      )
    }
    const line = encodeURIComponent(this.route_short_name)
    const agency = encodeURIComponent(this.agency_id)
    const route = this.route_id ? encodeURIComponent(this.route_id) : null
    try {
      const base = `${local.endpoint}/${this.region}/line/${line}?agency_id=${agency}`
      const url = route ? `${base}&route_id=${route}` : base
      const res = await fetch(url)
      const data = await res.json()
      return data
    } catch (error) {
      throw error
    }
  }

  async getShape() {
    if (this.region === null || this.shape_id === null) {
      throw new Error('Requires both region and shape_id to be set.')
    }
    const shape = encodeURIComponent(this.shape_id)
    try {
      const res = await fetch(
        `${local.endpoint}/${this.region}/shapejson/${shape}`
      )
      const data = await res.json()
      return { ...data, ...this.getShapeBounds(data) }
    } catch (error) {
      throw new Error(error)
    }
  }

  getShapeBounds(data) {
    const bounds = {
      lon_min: data.coordinates[0][0],
      lon_max: data.coordinates[0][0],
      lat_min: data.coordinates[0][1],
      lat_max: data.coordinates[0][1],
    }
    data.coordinates.forEach(item => {
      if (item[0] < bounds.lon_min) {
        bounds.lon_min = item[0]
      }
      if (item[0] > bounds.lon_max) {
        bounds.lon_max = item[0]
      }
      if (item[1] < bounds.lat_min) {
        bounds.lat_min = item[1]
      }
      if (item[1] > bounds.lat_max) {
        bounds.lat_max = item[1]
      }
    })

    return {
      bounds,
      center: data.coordinates[Math.round(data.coordinates.length / 2)],
    }
  }

  async getTimetable(offset) {
    if (this.stop_id === null) {
      throw new Error('Requires stop_id to be set')
    }
    const res = await fetch(
      [
        local.endpoint,
        this.region,
        'station',
        this.stop_id,
        'timetable',
        this.route_short_name,
        this.direction_id,
        `${offset}?agency_id=${this.agency_id}`,
      ].join('/')
    )
    const data = await res.json()
    return data
  }

  async getRealtime() {
    const line = encodeURIComponent(this.route_short_name)
    const agency = encodeURIComponent(this.agency_id)
    const routeId = encodeURIComponent(this.route_id)
    const res = await fetch(
      `${local.endpoint}/${this.region}/realtime/${line}?agency_id=${agency}&route_id=${routeId}`
    )
    const data = await res.json()
    if (res.status >= 400) {
      const error = new Error(data.message)
      error.response = data
      throw error
    }
    return data
  }

  async getRealtimeStopUpdate() {
    const { stop_id } = this
    const trips = this.realtime_trips
    if (trips.length === 0) return {}

    const res = await fetch(`${local.endpoint}/${this.region}/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stop_id,
        trips,
      }),
    })
    const data = await res.json()
    if (res.status >= 400) {
      const error = new Error(data.message)
      error.response = data
      throw error
    }
    return data
  }

  async getTripStops() {
    if (this.trip_id === null) {
      throw new Error('Requires trip_id to be set.')
    }
    const res = await fetch(
      `${local.endpoint}/${this.region}/trip/${encodeURIComponent(
        this.trip_id
      )}/stops`
    )
    const data = await res.json()
    if (res.status >= 400) {
      const error = new Error(data.message)
      error.response = data
      throw error
    }
    return data
  }
}

export default LineData
