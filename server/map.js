var fs = require('fs')
var request = require('request')

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
  table: {},
  inited: false,
  init: function() {
    try {
      fs.statSync('cache/stops.json')
    } catch(err) {
      return false
    }
    fs.readFile('cache/stops.json', function(err, data) {
      if (err) throw err;
      JSON.parse(data).response.forEach(function(s) {
        var center = `&center=${s.stop_lat},${s.stop_lon}`
        map.table[s.stop_id] = url + center
      })
      map.inited = true
    })
  },
  getMap: function(req, res) {
    if (map.inited == false) {
      map.init()
      res.send('')
    }
    var fileName = 'cache/maps/'+req.params.map+'.png'
    try {
      fs.statSync(fileName)
      fs.createReadStream(fileName).pipe(res)
    } catch(err) {
      var req = request(map.table[req.params.map]||map.table[3389]).pipe(fs.createWriteStream(fileName))
      req.on('finish', function() {
        fs.createReadStream(fileName).pipe(res)
      })
    }
  }
}
map.init()
module.exports = map