var http = require('http')
var express = require('express')
var bodyParser = require('body-parser')
var staticrender = require('./server/staticrender')
// var compression = require('compression')

var app = express()
app.disable('x-powered-by')
app.use(bodyParser.json()) // can parse post requests
// compression performed by nginx
// set headers for every request
app.use(function(req, res, next) {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// redirects trailing slash to /
app.use(function(req, res, next) {
  if (req.url.substr(-1) == '/' && req.url.length > 1) {
    res.redirect(301, req.url.slice(0, -1))
  } else {
    next()
  }
})

var cb = function(req, res) {
  res.set('Link',  `</style.css>; rel=preload; as='style', </generated/vendor.bundle.js>; rel=preload; as='script', </generated/app.bundle.js>; rel=preload; as='script'`)
  res.sendFile(__dirname + '/dist/index.html')
}
app.use('/a', require('./server'))
app.use('/scss', express.static(__dirname + '/scss'))
app.get('/', staticrender.serve)
app.use('/', express.static(__dirname + '/dist'))
app.get('/*', staticrender.serve)
 
// the router routes stuff through this port
var port = 8000
if (process.env.NODE_ENV === 'dev') {
  port = 8001
}
app.listen(port, function() {
	console.log('listening on localhost:' + port)
});
