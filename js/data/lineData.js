import local from '../../local'

export class LineData {
  constructor(props) {
    this.region = props.region || null
    this.line_id = props.line_id || null
    this.shape_id = props.shape_id || null
    this.trip_id = props.trip_id || null
  }
  getMeta() {
    return new Promise((resolve, reject) => {
      if (this.region === null || this.line_id === null) {
        return reject('Requires both region and line_id to be set.')
      }
      const line = encodeURIComponent(this.line_id)
      fetch(`${local.endpoint}/${this.region}/line/${line}`)
        .then(response => {
          response.json().then(data => {
            resolve(data)
          })
        })
        .catch(reject)
    })
  }
  getShape() {
    return new Promise((resolve, reject) => {
      if (this.region === null || this.shape_id === null) {
        return reject('Requires both region and shape_id to be set.')
      }
      const shape = encodeURIComponent(this.shape_id)
      fetch(`${local.endpoint}/${this.region}/shapejson/${shape}`)
        .then(response => {
          response.json().then(data => {
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
            data.center =
              data.coordinates[Math.round(data.coordinates.length / 2)]
            resolve(data)
          })
        })
        .catch(reject)
    })
  }
  getStops() {
    return new Promise((resolve, reject) => {
      if (this.region === null) {
        return reject('Requires region to be set.')
      }

      let url = `${local.endpoint}/${this.region}/stops/`
      if (this.trip_id !== null) {
        url += `trip/${encodeURIComponent(this.trip_id)}`
      } else if (this.shape_id !== null) {
        url += `shape/${encodeURIComponent(this.shape_id)}`
      } else {
        return reject('Requires shape_id or trip_id to be set.')
      }
      fetch(url)
        .then(response => {
          response.json().then(data => {
            resolve(data)
          })
        })
        .catch(reject)
    })
  }
}
