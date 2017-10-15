const request = require('request')

const sitemap = require('./sitemap.js')
const Defaults = require('./defaults.js')
const defaults = new Defaults()

sitemap.add('/l')
Object.keys(defaults.prefixes).forEach((region) => {
  sitemap.add('/l/' + region)
})

class Lines {
  constructor() {
    this.region = this.region.bind(this)
    this.line = this.line.bind(this)
  }
  regionMiddleware(req, res) {
    if (!isNaN(parseFloat(req.params.region))) {
      let path = req.path.split('/')
      path.splice(2, 0, 'nz-akl')
      return res.redirect(301, path.join('/'))
    }
    return defaults.notFound(res)
  }
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
      return this.regionMiddleware(req, res)
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
  line(req, res) {
    if (typeof defaults.prefixes[req.params.region] === 'undefined') {
      return this.regionMiddleware(req, res)
    }
    request([defaults.server, req.params.region, 'line', req.params.line].join('/'), function(err, response, body) {
      body = JSON.parse(body)
      if (response.statusCode === 404 || body.length === 0) {
        return defaults.notFound(res)
      } else if (err) {
        return res.status(500).send({message: 'internal server error'})
      }
      const data = body[0]
      res.send(
        defaults.success(
          'layout',
          data.route_short_name + ' - ' + data.route_long_name + defaults.name,
          `Route map & timetable for ${data.route_short_name} services, ${defaults.prefixes[req.params.region]}.`,
          req.path,
          null,
          req.params.region
        )
      )
    })
  }
}
module.exports = Lines