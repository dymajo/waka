var http = require('http')
var express = require('express')
var bodyParser = require('body-parser')
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

var cb = function(req, res) {
  res.set('Link',  '</style.css>; rel=preload; as=style, </app.js>; rel=preload; as=script')
  res.sendFile(__dirname + '/dist/index.html')
}
app.use('/a', require('./server'));
app.use('/scss', express.static(__dirname + '/scss'))
app.get('/', cb)
app.use('/', express.static(__dirname + '/dist'))
app.get('/*', cb)
 
// the router routes stuff through this port
var port = 8000
if (process.env.NODE_ENV === 'dev') {
  port = 8001
}
app.listen(port, function() {
	console.log('listening on localhost:' + port)
});
