import {
  createReadStream,
  existsSync,
  mkdirSync,
  writeFileSync,
  readdir,
} from 'fs'
import { resolve as _resolve } from 'path'
import csvparse from 'csv-parse'
import transform from 'stream-transform'
import log from '../logger'
import Storage from './storage'
import config from '../config'

class CreateShapes {
  storageSvc: Storage

  constructor() {
    this.storageSvc = new Storage({
      backing: config.storageService,
      local: config.emulatedStorage,
      region: config.shapesRegion,
    })
  }

  create(inputFile: string, outputDirectory: string, versions: string[]) {
    return new Promise((resolve, reject) => {
      const input = createReadStream(inputFile)
      const parser = csvparse({ delimiter: ',' })

      const output: {
        [shape_id: string]: { type: string; coordinates: number[][] }
      } = {}
      let headers: { [key: string]: number } = null
      let total = 0

      const handler: transform.Handler = (row, callback) => {
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
      }
      const transformer = transform(handler)
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
            const dir = _resolve(outputDirectory, subfolder)
            if (!existsSync(dir)) {
              mkdirSync(dir)
            }
            writeFileSync(
              _resolve(dir, `${Buffer.from(key).toString('base64')}.json`),
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

  upload(container: string, directory: string) {
    return new Promise((resolve, reject) => {
      if (config.shapesSkip === true) {
        log('Skipping Shapes Upload.')
        return resolve()
      }
      let total = 0
      const uploadSingle = (files: string[], index: number, callback: any) => {
        if (index === files.length) {
          log(`${container}:`, 'Upload Complete!', total, 'Shapes.')
          return resolve()
        }

        const fileName = files[index]
        const key = `${config.prefix}/${directory
          .split('/')
          .slice(-1)[0]
          .replace('_', '-')
          .replace('.', '-')}/${fileName}`
        const fileLocation = _resolve(directory, fileName)
        this.storageSvc.uploadFile(
          container,
          key,
          fileLocation,
          (error: any) => {
            if (error) {
              log(`${container}:`, 'Could not upload shape.', error)
            }
            total += 1
            if (total % 100 === 0) {
              log(`${container}:`, 'Uploaded', total, 'Shapes.')
            }
            callback(files, index + 1, callback)
          }
        )
        return true
      }

      readdir(directory, (err, files) => {
        if (err) {
          log(err)
        }
        uploadSingle(files, 0, uploadSingle)
      })
    })
  }
}
export default CreateShapes
