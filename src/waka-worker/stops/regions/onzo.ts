// TODO: this is not implemented.
import Request from 'request'

const onzos = [{ onzo: { bike: 1 } }]

const onzo = {
  getBikes(lat, lon, dis) {
    return new Promise((resolve, reject) => {
      const options = {
        url: `https://app.onzo.co.nz/nearby/${lat}/${lon}/${dis}`,
        json: true,
      }
      Request(options, (error, response, body) => {
        if (error) {
          return
        }
        resolve(
          body.data.map(onzo => ({
            stop_id: onzo.iccid,
            stop_lat: onzo.latitude,
            stop_lon: onzo.longitude,
            stop_lng: onzo.longitude,
            stop_region: 'nz-akl',
            route_type: -2,
            stop_name: 'Onzo Bike',
            battery: onzo.battery,
            updated: onzo.updateTime,
          }))
        )
      })
    })
  },
}

export default onzo
