var request = require('request')
var azure = require('azure-storage')
var wkx = require('wkx')

var tableSvc = azure.createTableService()

var routeSearchOptions = {
    url: 'https://api.at.govt.nz/v2/gtfs/routes/routeShortName/',
    headers: {
        'Ocp-Apim-Subscription-Key': process.env.atApiKey
    }
}

var shapeWKBOptions = {
    url: 'https://api.at.govt.nz/v2/gtfs/shapes/geometry/',
    headers: {
        'Ocp-Apim-Subscription-Key': process.env.atApiKey
    }
}

var line = {
    getLine: function(req, res) {
         
        var newOpts = JSON.parse(JSON.stringify(routeSearchOptions))
        newOpts.url += req.params.line
        request(newOpts, function(err, response, body) {
            if (err) {
                res.send({
                    error: err
                })
                return
            }
            var data = JSON.parse(body).response
            var promises = []
            for (var i=0; i<data.length; i++){            
                promises.push(new Promise(function(resolve, reject) {
                    var j = i
                    var query = new azure.TableQuery()
                        .top(1)
                        .where('route_id eq ?', data[i].route_id)
                    tableSvc.queryEntities('trips', query, null, function(err, result, response){
                        if (err) {
                            return reject(err)
                        }
                        if (result.entries.length > 0) {
                            console.log(result.entries[0].shape_id._)
                            console.log(j)
                            console.log(data[j])
                            data[j].shape_id = result.entries[0].shape_id._
                        }
                        resolve() 
                    })
                }))
            }
            Promise.all(promises).then(function(){
                res.send(data)
            })
            
            
            // promises.all
        })
    },
    getShape: function(req, res) {
        var newOpts = JSON.parse(JSON.stringify(shapeWKBOptions))
        newOpts.url += req.params.line
        request(newOpts, function(err, response, body){
            if (err) {
                res.send({
                    error: err
                })
                return
            }
            res.send(JSON.parse(body).response[0].the_geom)
        })  
    }
}

module.exports = line

