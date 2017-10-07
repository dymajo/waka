const request = require('request')

const Defaults = require('./defaults.js')
const defaults = new Defaults()

class Stations {
  index(req, res) {
    res.send(
      defaults.success(
        'stations',
        'Stations' + defaults.name,
        'View stop time schedules and realtime information.',
        req.path
      )
    )
  }
  region(req, res) {
    if (typeof defaults.prefixes[req.params.region] === 'undefined') {
      if (!isNaN(parseFloat(req.params.region))) {
        let path = req.path.split('/')
        path.splice(2, 0, 'nz-akl')
        return res.redirect(301, path.join('/'))
      }
      return defaults.notFound(res)
    }
    request([defaults.server, req.params.region, 'stations'].join('/'), function(err, response, body) {
      if (err) {
        return res.status(500).send({message: 'internal server error'})
      }
      const data = JSON.parse(body)
      if (data.items.length === 0) {
        return defaults.notFound(res)
      }
      // groups by route type
      const result = {}
      data.items.forEach((item) => {
        const rt = data.route_types[item.stop_id] || 3

        if (!(rt in result)) {
          result[rt] = []  
        }
        result[rt].push(item)
      })
      const group_names = [
        'Light Rail',
        'Metro',
        'Train',
        'Bus',
        'Ferry',
        'Cable Car',
        'Gondola',
        'Funicular'
      ]

      res.send(
        defaults.success(
          'stationsRegion',
          'All Stations - ' + defaults.prefixes[req.params.region] + defaults.name,
          'All ' + defaults.prefixes[req.params.region] + ' transit stations.',
          req.path,
          {group_names: group_names, data: result},
          req.params.region
        )
      )
    })
  }
}
module.exports = Stations