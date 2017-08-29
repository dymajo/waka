const express = require('express')
const pug = require('pug')
const template = pug.compileFile('./dist/template.pug')
const manifest = require('./dist/assets.json')

const compression = require('compression')
const app = express()
app.use(compression())

// redirects trailing slash to /
app.use(function(req, res, next) {
  if (req.url.substr(-1) == '/' && req.url.length > 1) {
    res.redirect(301, req.url.slice(0, -1))
  } else {
    next()
  }
})

const server = function(req, res) {
  res.send(template({
    title: 'Transit',
    description: 'localhost mode',
    vendorpath: '/' + manifest['vendor.js'],
    apppath: '/' + manifest['app.js'],
    analyticspath: '/' + manifest['analytics.js'],
    csspath: '/' + manifest['app.css']
  }))
}
app.use('/scss', express.static(__dirname + '/scss'))
app.get('/', server)
app.use('/', express.static(__dirname + '/dist'))
app.get('/*', server)
 
// the router routes stuff through this port
const port = 8009
app.listen(port, function() {
  console.log('Test Server listening on localhost:' + port)
})
