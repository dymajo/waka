var express = require('express')
var app = express()

app.get('/', express.static('root'))

var cb = function(req, res) {
  res.sendFile(__dirname + '/dist/index.html')
}
app.use('/', express.static(__dirname + '/dist'))
app.get('/*', cb)

app.listen(8000)
console.log('listening on localhost:8000')