const fs = require('fs')
const path = require('path')
const csvparse = require('csv-parse')
const transform = require('stream-transform')
const colors = require('colors')
const log = require('../../server-common/logger.js')

const config = require('../../config.js')
const Storage = require('./storage.js')
const storageSvc = new Storage({
  backing: config.storageService,
  local: config.emulatedStorage,
  region: config.shapesRegion
})

class createShapes {
  create(inputFile, outputDirectory, versions) {
    return new Promise((resolve, reject) => {
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
        if (total % 100000 === 0) {
          log('Parsed', total, 'Points')
        }

        return callback(null)
      }).on('finish', () => {
        log('Created Shapes. Writing to disk...')
        Object.keys(output).forEach((key) => {
          let subfolder = (versions.length === 1 ? versions[0] : versions[0] + '-extra')
          versions.forEach((version) => {
            if (key.match(version)) {
              subfolder = version
            }
          })
          let dir = path.resolve(outputDirectory, subfolder)
          if (!fs.existsSync(dir)){
            fs.mkdirSync(dir)
          }
          fs.writeFileSync(path.resolve(dir, `${new Buffer(key).toString('base64')}.json`), JSON.stringify(output[key]))
        })
        log('Written to disk!')
        resolve()
      }).on('error', () => {
        reject()
      })

      log('Building Shapes')
      input.pipe(parser).pipe(transformer)
    })
  }
  upload(container, directory) {
    return new Promise((resolve, reject) => {
      let total = 0
      const uploadSingle = function(files, index, callback) {
        if (index === files.length) {
          log(container.magenta +':', 'Upload Complete!', total, 'Shapes.')
          return resolve()
        }

        const fileName = files[index]
        const key = encodeURIComponent(`${global.config.prefix}/${directory.replace('_', '-').replace('.', '-')}/${fileName}`)
        const fileLocation = path.resolve(directory, fileName)
        storageSvc.uploadFile(container, key, fileLocation, function(error) {
          if (error) {
            console.error(container.magenta+':', 'Could not upload shape.', error)
          }
          total++
          if (total % 100 === 0) {
            log(container.magenta+':', 'Uploaded', total, 'Shapes.')
          }
          callback(files, index+1, callback)
        })
      }

      // TODO: this should be fixed to be a loop, not a weird recursive thing
      fs.readdir(directory, function(err, files) {
        if (err) {
          console.error(err)
        }
        uploadSingle(files, 0, uploadSingle)
      })
    })
  }
}
module.exports = createShapes