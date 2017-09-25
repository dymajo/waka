const router = require('express').Router()
const pug = require('pug')

const template = {
  layout: pug.compileFile('server/templates/layout.pug'),
  notFound: pug.compileFile('server/templates/404.pug'),
  stations: pug.compileFile('server/templates/stations.pug'),
  stationsRegion: pug.compileFile('server/templates/stations-region.pug'),
  lines: pug.compileFile('server/templates/lines.pug'),
  linesRegion: pug.compileFile('server/templates/lines-region.pug')
}

const station = require('../station.js')
const search = require('../search.js')
const line = require('../lines/index.js')
const manifest = require('../../dist/assets.json')

const defaultName = ' - Transit'
const defaults = {
  title: 'Transit',
  vendorpath: '/' + manifest['vendor.js'],
  apppath: '/' + manifest['app.js'],
  analyticspath: '/' + manifest['analytics.js'],
  csspath: '/' + manifest['app.css']
}
const prefixes = {
  'nz-akl': 'Auckland',
  'nz-wlg': 'Wellington'
}

const success = function(
  templateName,
  title,
  description,
  canonical,
  data = null,
  region = 'nz-akl'
) {
  const content = Object.assign(defaults, {
    title: title,
    description: description,
    canonical: canonical,
    data: data,
    region: region
  })
  return template[templateName](content)
}
const notFound = function(res) {
  res.status(404).send(
    template.notFound({
      title: 'Not Found - Transit',
      description:
        'Sorry, but the page you were trying to view does not exist.',
      vendorpath: '/' + manifest['vendor.js'],
      apppath: '/' + manifest['app.js'],
      analyticspath: '/' + manifest['analytics.js'],
      csspath: '/' + manifest['app.css']
    })
  )
}

let title = 'DYMAJO Transit'
let description =
  'Your way around Auckland. Realtime, beautiful, and runs on all of your devices.'
let canonical = 'https://transit.dymajo.com'

router.get('/', (req, res) => {
  res.send(success('layout', title, description, canonical + req.path))
})
router.get('/s', (req, res) => {
  res.send(
    success(
      'stations',
      'Stations' + defaultName,
      'View stop time schedules and realtime information.',
      canonical + req.path
    )
  )
})
router.get('/s/:region', (req, res) => {
  if (typeof prefixes[req.params.region] === 'undefined') {
    if (!isNaN(parseFloat(req.params.region))) {
      let path = req.path.split('/')
      path.splice(2, 0, 'nz-akl')
      return res.redirect(301, path.join('/'))
    }
    return notFound(res)
  }
  search._allStops(req.params.region).then((data) => {
    if (data.items.length === 0) {
      return notFound(res)
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
      success(
        'stationsRegion',
        'All Stations - ' + prefixes[req.params.region] + defaultName,
        'All ' + prefixes[req.params.region] + ' transit stations.',
        canonical + req.path,
        {group_names: group_names, data: result},
        req.params.region
      )
    )
  }).catch((err) => {
    res.status(500)
  })
})
router.get('/l', (req, res) => {
  res.send(
    success(
      'lines',
      'Lines' + defaultName,
      'View all lines and stop locations.',
      canonical + req.path
    )
  )
})
router.get('/l/:region', (req, res) => {
  if (typeof prefixes[req.params.region] === 'undefined') {
    if (!isNaN(parseFloat(req.params.region))) {
      let path = req.path.split('/')
      path.splice(2, 0, 'nz-akl')
      return res.redirect(301, path.join('/'))
    }
    return notFound(res)
  }
  res.send(
    success(
      'linesRegion',
      'All Lines - ' + prefixes[req.params.region] + defaultName,
      'View ' + prefixes[req.params.region] + ' lines and stop locations.',
      canonical + req.path,
      line._getLines(req.params.region),
      req.params.region
    )
  )
})
router.get('/*', (req, res) => {
  res.send(success('layout', title, description, canonical + req.path))
})

module.exports = router
