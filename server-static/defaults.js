const pug = require('pug')
const manifest = require('../dist/assets.json')

const template = {
  layout: pug.compileFile('server-static/templates/layout.pug'),
  notFound: pug.compileFile('server-static/templates/404.pug'),
  stations: pug.compileFile('server-static/templates/stations.pug'),
  stationsRegion: pug.compileFile('server-static/templates/stations-region.pug'),
  lines: pug.compileFile('server-static/templates/lines.pug'),
  linesRegion: pug.compileFile('server-static/templates/lines-region.pug')
}

const dtitle = 'DYMAJO Transit'
const ddescription = 'Your way around Auckland. Realtime, beautiful, and runs on all of your devices.'
const dcanonical = 'https://transit.dymajo.com'

const defaults = {
  vendorpath: '/' + manifest['vendor.js'],
  apppath: '/' + manifest['app.js'],
  analyticspath: '/' + manifest['analytics.js'],
  csspath: '/' + manifest['app.css']
}

class Defaults {
  constructor() {
    this.name = ' - Transit'
    this.server = 'http://localhost:8000/a'
    this.prefixes = {
      'nz-akl': 'Auckland',
      'nz-wlg': 'Wellington'
    }
    this.index = this.index.bind(this)
  }
  success(
    templateName,
    title,
    description,
    canonical,
    data = null,
    region = 'nz-akl'
  ) {
    const content = Object.assign(defaults, {
      title: title || dtitle,
      description: description || ddescription,
      canonical: dcanonical + canonical,
      data: data,
      region: region
    })
    return template[templateName](content)
  }
  notFound(res) {
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
  index(req, res) {
    res.send(this.success('layout', undefined, undefined, req.path))  
  }
}
module.exports = Defaults
