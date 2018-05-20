const Request = require('request')

const onzos = [{ onzo: { bike: 1 } }]

const onzo = {
  getBikes(lat, lon, dis) {
    const options = {}
    options.url = `https://app.onzo.co.nz/nearby/${lat}/${lon}/${dis}`
    options.json = true
    Request(options, (error, response, body) => {
      if (error) {
        return
      }
      body.data.map(onzo => {
        onzos.push({
          stop_id: onzo.iccid,
          stop_lat: onzo.latitude,
          stop_lon: onzo.longitude,
          stop_lng: onzo.longitude,
          stop_region: 'nz-akl',
          route_type: -2,
          stop_name: 'Onzo Bike',
          battery: onzo.battery,
          updated: onzo.updateTime,
        })
      })
      return Promise.resolve(onzos)
    })
  },
}

module.exports = onzo
