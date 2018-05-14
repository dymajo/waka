const Request = require('request')

const onzos = []

const onzo = {
  async getBikes(lat, dis, lon) {
    // const { lat, dis, lon } = req.query

    const options = {}
    options.url = `https://app.onzo.co.nz/nearby/${lat}/${lon}/${dis}`
    options.json = true
    Request(options, (error, response, body) => {
      if (error) {
        return
      }

      await body.data.forEach(onzo => {
        onzos.append({
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
      console.log(onzos)
    })
  },
}

module.exports = onzo
