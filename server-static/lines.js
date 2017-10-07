const request = require('request')

const Defaults = require('./defaults.js')
const defaults = new Defaults()

class Lines {
  index(req, res) {
    res.send(
      defaults.success(
        'lines',
        'Lines' + defaults.name,
        'View all lines and stop locations.',
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
    request([defaults.server, req.params.region, 'lines'].join('/'), function(err, response, body) {
      if (err) {
        return res.status(500).send({message: 'internal server error'})
      }
      const data = JSON.parse(body)
      res.send(
        defaults.success(
          'linesRegion',
          'All Lines - ' + defaults.prefixes[req.params.region] + defaults.name,
          'View ' + defaults.prefixes[req.params.region] + ' lines and stop locations.',
          req.path,
          data,
          req.params.region
        )
      )
    })
  }
}
module.exports = Lines