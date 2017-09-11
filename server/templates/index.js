const router = require('express').Router()
const pug = require('pug')

const template = {
  layout: pug.compileFile('server/templates/layout.pug'),
  stations: pug.compileFile('server/templates/stations.pug'),
}

const station = require('../station.js')
const line = require('../line.js')
const manifest = require('../../dist/assets.json')

const defaultName = ' - Transit'
const defaults = {
  title: 'Transit',
  vendorpath: '/' + manifest['vendor.js'],
  apppath: '/' + manifest['app.js'],
  analyticspath: '/' + manifest['analytics.js'],
  csspath: '/' + manifest['app.css']
}

const success = function(templateName, title, description, canonical) {
  const content = Object.assign(defaults, {
    title: title,
    description: description,
    canonical: canonical
  })
  return template[templateName](content)
}


let title = 'DYMAJO Transit'
let description = 'Your way around Auckland. Realtime, beautiful, and runs on all of your devices.'
let canonical = 'https://transit.dymajo.com'

router.get('/', (req, res) => {
  res.send(success('layout', title, description, canonical + req.path))
})
router.get('/s', (req, res) => {
  res.send(success('stations', title, description, canonical + req.path))
})
router.get('/*', (req, res) => {
  res.send(success('layout', title, description, canonical + req.path))
})

module.exports = router

// TODO: Make this play perfectly with the router in the client side
const staticrender = {
  serve: function(req, res) {
    let title = 'DYMAJO Transit'
    let description = 'Your way around Auckland. Realtime, beautiful, and runs on all of your devices.'
    let canonical = 'https://transit.dymajo.com' + req.path

    const notFound = function() {
      res.status(404).send(template({
        title: 'Not Found - Transit',
        description: 'Sorry, but the page you were trying to view does not exist.',
        vendorpath: '/' + manifest['vendor.js'],
        apppath: '/' + manifest['app.js'],
        analyticspath: '/' + manifest['analytics.js'],
        csspath: '/' + manifest['app.css']
      }))
    }
    

    let path = req.path.split('/')
    if (path[1] === '') {
      canonical = 'https://transit.dymajo.com'
      success()
    } else if (path[1] === 's') {
      if (path.length === 3) {
        path.splice(2, 0, 'nz-akl')
        return res.redirect(301, path.join('/'))
        // return res.redirect(301, ca)
      } else if (path.length === 4) {
        if (path[3].split('+').length > 1) {
          title = 'Multi Stop' + defaultName
          description = 'Realtime departures and timetable.'
          success()
          return
        }
        station._stopInfo(path[3], 'nz-akl').then(function(data) {
          title = data.stop_name + defaultName
          description = 'Realtime departures and timetable for '
          if (data.stop_name.toLowerCase().match('train station')|| 
            data.stop_name.toLowerCase().match('ferry terminal')) {
            description += data.stop_name
          } else {
            description += 'Bus Stop ' + path[2].trim()
          }
          description += ', Auckland.'

          success()
        }).catch(notFound)
      } else if (path.length === 6) {
        if (path[4] === 'timetable') {
          title = path[5].split('-')[0] + ' Timetable' + defaultName
          description = 'View timetable in DYMAJO Transit.'
          success()
        } else if (path[4] === 'realtime') {
          title = 'Realtime Trip Info' + defaultName
          description = 'View live vehicle location in DYMAJO Transit.'
          success()
        } else {
          return notFound()  
        }
      } else {
        return notFound()
      }
    } else if (path[1] === 'l') {
      if (path.length === 2) {
        path.splice(2, 0, 'nz-akl')
        return res.redirect(301, path.join('/'))
      } else if (path.length === 3) {
        title = 'Lines' + defaultName
        description = 'View all Auckland Bus, Train, and Ferry Services.'
        success()
      } else if (path.length === 4) {
        path[3] = path[3].trim()
        line._getLine(path[3], function(err, data) {
          if (data.length === 0) {
            return notFound()
          } else {
            title = `${data[0].route_short_name} - ${line._friendlyNames[path[2]] || data[0].route_long_name}${defaultName}`
            description = `View route information and timetables for ${line._friendlyNames[path[2]]||path[2]} services.`
            success()
          }
        })
      } else {
        return notFound()
      }
    } else if ((path[1] === 'settings' || path[1] === 'sponsor') && path.length === 2){
      return success()
    } else {
      return notFound()
    }
  }
}