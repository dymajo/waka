var request = require('request')

var tripUpdatesOptions = {
  url: 'https://api.at.govt.nz/v2/public/realtime/tripupdates',
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.atApiKey
  }
}

var realtime = {
	getTrips: function(req, res) {
		if (!req.body.trips) {
			res.send({
				message: 'please send trips'
			})
		}

		// i feel like we should sanatize this or something...
		var newOpts = JSON.parse(JSON.stringify(tripUpdatesOptions))
    newOpts.url += '?tripid=' + req.body.trips.join(',')
    request(newOpts, function(err, response, body) {
      if (err) {
      	res.send({
      		error: err
      	})
      	return
      }

      res.send(body)	
    })
	}	
}
module.exports = realtime