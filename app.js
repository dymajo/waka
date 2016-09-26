var http = require('http')
var express = require('express')
var bodyParser = require('body-parser')
// var compression = require('compression')

var app = express()
app.use(bodyParser.json()) // can parse post requests
// going to use nginx for this
// app.use(compression()) // compresses all requests

var cb = function(req, res) {
  res.sendFile(__dirname + '/dist/index.html')
}
app.use('/a', require('./server'));
app.use('/', express.static(__dirname + '/dist'))
app.use('/dist/maps', express.static(__dirname + '/dist/maps'))
app.get('/*', cb)
 
// the router routes stuff through this port
var port = 8000
if (process.env.NODE_ENV === 'dev') {
  port = 8001
}
app.listen(port, function() {
	console.log('listening on localhost:' + port)
});
