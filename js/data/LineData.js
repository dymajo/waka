import local from '../../local'

class LineData {
  constructor(props) {
    this.region = props.region || null
    this.line_id = props.line_id || null
    this.agency_id = props.agency_id || null
    this.shape_id = props.shape_id || null
    this.trip_id = props.trip_id || null
  }

  async getMeta() {
    if (
      this.region === null ||
      this.line_id === null ||
      this.agency_id === null
    ) {
      return 'Requires both region, line_id, and agency_id to be set.'
    }
    const line = encodeURIComponent(this.line_id)
    const agency = encodeURIComponent(this.agency_id)
    try {
      const res = await fetch(
        `${local.endpoint}/${this.region}/line/${line}?agency_id=${agency}`
      )
      const data = await res.json()
      return data
    } catch (error) {
      throw error
    }
  }

  async getShape() {
    if (this.region === null || this.shape_id === null) {
      return new Error('Requires both region and shape_id to be set.')
    }
    const shape = encodeURIComponent(this.shape_id)
    try {
      const res = await fetch(
        `${local.endpoint}/${this.region}/shapejson/${shape}`
      )
      const data = await res.json()
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
      data.bounds = bounds

      data.bounds = bounds
      data.center = data.coordinates[Math.round(data.coordinates.length / 2)]
      return data
    } catch (error) {
      throw new Error(error)
    }
  }

  async getStops() {
    if (this.region === null) {
      return reject(new Error('Requires region to be set.'))
    }

    let url = `${local.endpoint}/${this.region}/stops/`
    if (this.trip_id !== null) {
      url += `trip/${encodeURIComponent(this.trip_id)}`
    } else if (this.shape_id !== null) {
      url += `shape/${encodeURIComponent(this.shape_id)}`
    } else {
      throw new Error('Requires shape_id or trip_id to be set.')
    }
    try {
      const res = await fetch(url)
      const data = await res.json()
      return data
    } catch (error) {
      throw new Error(error)
    }
  }

  async getRealtime() {
    const line = encodeURIComponent(this.line_id)
    const agency = encodeURIComponent(this.agency_id)
    const res = await fetch(
      `${local.endpoint}/${this.region}/realtime/${line}?agency_id=${agency}`
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
