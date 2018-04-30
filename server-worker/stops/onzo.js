const Request = require('request')

const onzo = {
  getBikes: (req, res) => {
    const { lat, dis, lon } = req.query

    const options = {}
    options.url = `https://app.onzo.co.nz/nearby/${lat}/${lon}/${dis}`
    options.json = true
    Request(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.send(body.data)
      } else {
        res.send('error, cannot access onzo')
      }
    })
  },
}

module.exports = onzo
