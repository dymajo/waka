var fs = require('fs')
var moment = require('moment')

var parsed = {}

fs.readFile('calendardate.json', function(err, data) {
  var data = JSON.parse(data)
  data.response.forEach(function(service) {
    if (service.exception_type == 1) {
      if (typeof(parsed[service.service_id]) === 'undefined') {
        parsed[service.service_id] = [[],[],[],[],[],[],[]]
      }
      parsed[service.service_id][moment.utc(service.date).isoWeekday() - 1].push(service.date)
    }
  })
  fs.writeFile('calendardate-parsed.json', JSON.stringify(parsed))
})