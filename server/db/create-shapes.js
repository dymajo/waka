const fs = require('fs')
const path = require('path')
const csvparse = require('csv-parse')
const transform = require('stream-transform')

class createShapes {
  createShapes(inputFile, outputDirectory) {
    const input = fs.createReadStream(inputFile)
    const parser = csvparse({delimiter: ','})

    let output = {}
    let headers = null
    let total = 0
    const transformer = transform((row, callback) => {
      // builds the csv headers for easy access later
      if (headers === null) {
        headers = {}
        row.forEach(function(item, index) {
          headers[item] = index
        })
        return callback(null)
      }

      if (!(row[headers['shape_id']] in output)) {
        // geojson
        output[row[headers['shape_id']]] = {
          'type': 'LineString', 
          'coordinates': []
        }
      }
      output[row[headers['shape_id']]].coordinates.push([
        parseFloat(row[headers['shape_pt_lon']]),
        parseFloat(row[headers['shape_pt_lat']]),
      ])
      total++
      if (total % 50000 === 0) {
        console.log('Parsed', total, 'Points')
      }

      return callback(null)
    }).on('finish', () => {
      console.log('Created Shapes. Writing to disk...')
      Object.keys(output).forEach((key) => {
        fs.writeFileSync(path.resolve(outputDirectory, `${key}.json`), JSON.stringify(output[key]))
      })
      console.log('Written to disk!')
    })

    console.log('Building Shapes')
    input.pipe(parser).pipe(transformer)
  }
}
let jono = new createShapes()
jono.createShapes('shapes.txt', 'output')
