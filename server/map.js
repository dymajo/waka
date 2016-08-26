const fs = require('fs')
const request = require('request')
const azure = require('azure-storage')
const imagemin = require('imagemin')
const webp = require('imagemin-webp')

var tableSvc = azure.createTableService()

var url =
`https://maps.googleapis.com/maps/api/staticmap?zoom=16&size=600x350&scale=2&maptype=roadmap
&style=feature:water|element:geometry|color:0xcad2d3|lightness:17
&style=feature:landscape|element:geometry|color:0xf5f5f5|lightness:20
&style=feature:road.highway|element:geometry.fill|color:0xffffff|lightness:17
&style=feature:road.highway|element:geometry.stroke|color:0xffffff|lightness:29|weight:0.2
&style=feature:road.arterial|element:geometry|color:0xffffff|lightness:18
&style=feature:road.local|element:geometry|color:0xffffff|lightness:16
&style=feature:poi|element:geometry|color:0xf5f5f5|lightness:21
&style=feature:poi.park|element:geometry|color:0xdedede|lightness:21
&style=feature:transit|element:geometry|color:0xf2f2f2|lightness:19
&style=feature:administrative|element:geometry.fill|color:0xfefefe|lightness:20
&style=feature:administrative|element:geometry.stroke|color:0xfefefe|lightness:17|weight:1.2
&style=element:labels.text.stroke|visibility:off
&style=element:labels.text.fill|visibility:on|color:0xbbbbbb
&style=element:labels.icon|visibility:off
&key=${process.env.mapsApiKey}`.replace(/\r?\n|\r/g, '')

var map = {
  getMap: function(req, res) {
    var fileName = 'cache/maps/'+req.params.map
    try {
      fs.statSync(fileName)
      fs.createReadStream(fileName).pipe(res)
    } catch(err) {
      // goes to azure and gets the lat long of where the stop is
      var stopId = req.params.map.replace('.png', '').replace('.webp', '')
      tableSvc.retrieveEntity('stops', 'allstops', stopId, function(error, result, response){
        if (error) {
          fs.createReadStream('dist/error.png').pipe(res)
          return
        }
        var center = `&center=${result.stop_lat._},${result.stop_lon._}`
        var req = request(url + center).pipe(fs.createWriteStream('cache/maps/' + stopId + '.png'))
        req.on('finish', function() {
          imagemin(['cache/maps/' + stopId + '.png'], 'cache/maps', {
            plugins: [
              webp({lossless: true})
            ]
          }).then(function() {
            fs.createReadStream(fileName).pipe(res)
          })
        })
      })   
    }
  }
}
module.exports = map