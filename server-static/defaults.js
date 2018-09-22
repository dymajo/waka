const pug = require('pug')
const fs = require('fs')
const colors = require('colors')
const path = require('path')

let manifest = null
if (fs.existsSync(path.join(__dirname, '../dist/assets.json'))) {
  manifest = require('../dist/assets.json')
} else {
  const pid = ('      ' + process.pid.toString(16)).slice(-6).green
  console.error(
    pid,
    'Static Server Terminating - dist/assets.json not found!'.red
  )
  console.error(pid, 'Make sure the client has been built.'.yellow)
  process.exit(1)
}

const template = {
  layout: pug.compileFile('server-static/templates/layout.pug'),
}

const dtitle = 'Waka'
const ddescription =
  'Your way around Auckland & Wellington. Realtime, beautiful, and runs on all of your devices.'
const dcanonical = 'https://getwaka.com'

const defaults = {
  vendorpath: '/' + manifest['vendor.js'],
  apppath: '/' + manifest['app.js'],
  analyticspath: '/' + manifest['analytics.js'],
  csspath: '/' + manifest['app.css'],
}

class Defaults {
  constructor() {
    this.name = ' - Waka'
    this.canonical = dcanonical
    this.index = this.index.bind(this)
  }
  success(templateName, title, description, canonical, data = null, region) {
    let splash = '/photos/splash.jpg'
    if (typeof region !== 'undefined') {
      splash = '/photos/' + region + '.jpg'
    } else {
      region = 'nz-akl'
    }

    const content = Object.assign(defaults, {
      title: title || dtitle,
      description: description || ddescription,
      canonical: dcanonical + canonical,
      data: data,
      region: region,
      splash: dcanonical + splash,
    })
    return template[templateName](content)
  }
  notFound(res) {
    res.status(404).send(
      template.layout({
        title: 'Not Found - Waka',
        description:
          'Sorry, but the page you were trying to view does not exist.',
        vendorpath: '/' + manifest['vendor.js'],
        apppath: '/' + manifest['app.js'],
        analyticspath: '/' + manifest['analytics.js'],
        csspath: '/' + manifest['app.css'],
      })
    )
  }
  index(req, res) {
    res.send(this.success('layout', undefined, undefined, req.path))
  }
}
module.exports = Defaults
