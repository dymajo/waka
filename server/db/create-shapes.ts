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

  public create = (
    inputFile: string,
    outputDirectory: string,
    versions: string[],
  ) => {
    return new Promise((resolve, reject) => {
      const input = createReadStream(inputFile)
      const parser = csvparse({ delimiter: ',', trim: true })

      const output: {
        [shape_id: string]: { type: string; coordinates: number[][] }
      } = {}
      let headers: { [key: string]: number } = null
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
            const dir = _resolve(outputDirectory, subfolder)
            if (!existsSync(dir)) {
              mkdirSync(dir)
            }
            writeFileSync(
              _resolve(dir, `${Buffer.from(key).toString('base64')}.json`),
              JSON.stringify(output[key]),
            )
          })
          log(`${Object.keys(output).length} shapes written to disk!`)
          resolve()
        })
        .on('error', () => {
          reject()
        })

      log('Building Shapes')
      input.pipe(parser).pipe(transformer)
    })
  }
  public upload = async (container: string, directory: string) => {
    if (config.shapesSkip === true) {
      log('Skipping Shapes Upload.')
      return
    }
    let total = 0
    let failed = 0
    const files = await readdirAsync(directory)

    for (const file of files) {
      try {
        await this.uploadSingle(file, directory, container)
        total += 1

        // if it's running in a tty, we don't have to log so much
        if (process.stdout.clearLine !== undefined) {
            process.stdout.clearLine()
            process.stdout.cursorTo(0)
        } else {
            process.stdout.write('\n')
        }
        process.stdout.write(
          ((total / files.length) * 100).toFixed(2) + '% Uploaded',
        )
      } catch (error) {
        failed += 1
        if (error.toJSON) {
          error = error.toJSON()
        }
        log(error)
      }
    }
    process.stdout.write('\n')
    log(`${container}:`, 'failed upload', failed, 'Shapes.')
    log(`${container}:`, 'Upload Complete!', total, 'Shapes.')
    return
  }

  private uploadSingle = async (
    fileName: string,
    directory: string,
    container: string,
  ) => {
    const key = `${config.prefix}/${directory
      .split('/')
      .slice(-1)[0]
      .replace('_', '-')
      .replace('.', '-')}/${fileName}`
    const fileLocation = _resolve(directory, fileName)
    return this.storageSvc.uploadFile(container, key, fileLocation)
  }
}

function readdirAsync(path: string) {
  return new Promise<string[]>(function(resolve, reject) {
    readdir(path, function(error, result) {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}
export default CreateShapes
