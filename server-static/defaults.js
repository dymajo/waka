const pug = require('pug')
const fs = require('fs')
const colors = require('colors')
const path = require('path')

const log = require('./lib/logger.js')
const Storage = require('./lib/storage.js')

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
  layout: pug.compileFile(path.join(__dirname, 'templates/layout.pug')),
}

const dtitle = 'Waka'
const ddescription =
  'Your way around Auckland & Wellington. Realtime, beautiful, and runs on all of your devices.'
const dcanonical = 'https://waka.app'

const defaults = {
  vendorpath: '/' + manifest['vendor.js'],
  apppath: '/' + manifest['app.js'],
  analyticspath: '/' + manifest['analytics.js'],
  csspath: '/' + manifest['app.css'],
  cssimagerealtimepath: '/icons/realtime.svg',
}

const uploadFiles = async () => {
  const client = new Storage({
    backing: process.env.storageService,
    local: false,
    region: process.env.storageRegion,
  })
  const container = process.env.storageContainer

  // we need this so we know what file maps to what key
  // it's 1-1 relationship, so it's okay
  const reverseDefaults = {}
  for (let key in defaults) {
    reverseDefaults[defaults[key]] = key
  }

  for (let file in manifest) {
    await new Promise((resolve, reject) => {
      client.uploadFile(
        container,
        manifest[file],
        path.join(__dirname, '../dist', manifest[file]),
        error => {
          if (error) reject(error)

          // remaps the path from the local source to the bucket
          defaults[
            reverseDefaults[`/${manifest[file]}`]
          ] = `https://${container}/${manifest[file]}`

          log('Uploaded & Mapped', manifest[file])
          resolve()
        }
      )
    })
  }
}
if (process.env.storageLocal === 'false') {
  // if you have storageLocal set to true,
  // we will upload all the static js & css to S3 & remap the hrefs
  // this is done at runtime, because it's difficult to do in a CI environment
  uploadFiles().then(() => {
    log('Uploaded generated files.')
  })
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
    const content = Object.assign(defaults, {
      title: 'Not Found - Waka',
      description:
        'Sorry, but the page you were trying to view does not exist.',
    })
    res.status(404).send(template.layout(content))
  }
  index(req, res) {
    res.send(this.success('layout', undefined, undefined, req.path))
  }
}
module.exports = Defaults
