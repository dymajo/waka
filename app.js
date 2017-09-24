var express = require('express')
var bodyParser = require('body-parser')
const templateEngine = require('./server/templates/index')
const colors = require('colors')
const appInsights = require('applicationinsights')

if (process.env.AZURE_INSIGHTS) {
  appInsights.setup(process.env.AZURE_INSIGHTS)
  appInsights.start()
  console.log('Started Azure Insights')
} else {
  console.log('Azure Insights API key is undefined.'.red)
}

var app = express()
app.disable('x-powered-by')
app.use(bodyParser.json()) // can parse post requests
// compression performed by nginx
// set headers for every request
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8009')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
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

app.use('/a', require('./server'))
app.use('/scss', express.static(__dirname + '/scss'))
app.get('/', templateEngine)
app.use('/', express.static(__dirname + '/dist'))
app.get('/*', templateEngine)
 
// the router routes stuff through this port
var port = 8000
if (process.env.NODE_ENV === 'dev') {
  port = 8001
}
app.listen(port, function() {
  console.log(('listening on localhost:' + port).green)
})
