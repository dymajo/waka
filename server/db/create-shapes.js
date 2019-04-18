const fs = require('fs')
const path = require('path')
const csvparse = require('csv-parse')
const transform = require('stream-transform')
const colors = require('colors')
const log = require('../logger.js')
const Storage = require('./storage.js')
const config = require('../config')

class CreateShapes {
  constructor() {
    this.storageSvc = new Storage({
      backing: config.storageService,
      local: config.emulatedStorage,
      region: config.shapesRegion,
    })
  }

  create(inputFile, outputDirectory, versions) {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(inputFile)
      const parser = csvparse({ delimiter: ',' })

      const output = {}
      let headers = null
      let total = 0
      const transformer = transform((row, callback) => {
        // builds the csv headers for easy access later
        if (headers === null) {
          headers = {}
          row.forEach((item, index) => {
            headers[item] = index
          })
          return callback(null)
        }

        if (!(row[headers.shape_id] in output)) {
          // geojson
          output[row[headers.shape_id]] = {
            type: 'LineString',
            coordinates: [],
          }
        }
        output[row[headers.shape_id]].coordinates.push([
          parseFloat(row[headers.shape_pt_lon]),
          parseFloat(row[headers.shape_pt_lat]),
        ])
        total += 1
        if (total % 100000 === 0) {
          log('Parsed', total, 'Points')
        }

        return callback(null)
      })
        .on('finish', () => {
          log('Created Shapes. Writing to disk...')
          Object.keys(output).forEach(key => {
            let subfolder =
              versions.length === 1 ? versions[0] : `${versions[0]}-extra`
            versions.forEach(version => {
              if (key.match(version)) {
                subfolder = version
              }
            })
            const dir = path.resolve(outputDirectory, subfolder)
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir)
            }
            fs.writeFileSync(
              path.resolve(dir, `${Buffer.from(key).toString('base64')}.json`),
              JSON.stringify(output[key])
            )
          })
          log('Written to disk!')
          resolve()
        })
        .on('error', () => {
          reject()
        })

      log('Building Shapes')
      input.pipe(parser).pipe(transformer)
    })
  }

  upload(container, directory) {
    return new Promise((resolve, reject) => {
      if (config.shapesSkip === true) {
        log('Skipping Shapes Upload.')
        return resolve()
      }
      let total = 0
      const uploadSingle = (files, index, callback) => {
        if (index === files.length) {
          log(`${container.magenta}:`, 'Upload Complete!', total, 'Shapes.')
          return resolve()
        }

        const fileName = files[index]
        const key = `${config.prefix}/${directory
          .split('/')
          .slice(-1)[0]
          .replace('_', '-')
          .replace('.', '-')}/${fileName}`
        const fileLocation = path.resolve(directory, fileName)
        this.storageSvc.uploadFile(container, key, fileLocation, error => {
          if (error) {
            console.error(
              `${container.magenta}:`,
              'Could not upload shape.',
              error
            )
          }
          total += 1
          if (total % 100 === 0) {
            log(`${container.magenta}:`, 'Uploaded', total, 'Shapes.')
          }
          callback(files, index + 1, callback)
        })
        return true
      }

      fs.readdir(directory, (err, files) => {
        if (err) {
          console.error(object)
        }
        uploadSingle(files, 0, uploadSingle)
      })
    })
  }
}
module.exports = CreateShapes
