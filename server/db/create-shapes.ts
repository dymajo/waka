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
import logger from '../logger'
import Storage from './storage'
import config from '../config'

const log = logger(config.prefix, config.version)

function readdirAsync(path: string) {
  return new Promise<string[]>((resolve, reject) => {
    readdir(path, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

class CreateShapes {
  storageSvc: Storage

  constructor() {
    this.storageSvc = new Storage({
      backing: config.storageService,
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
      const parser = csvparse({
        delimiter: ',',
        trim: true,
        bom: true,
        skip_lines_with_empty_values: true,
        skip_lines_with_error: true,
      })

      const output: {
        [shape_id: string]: { type: string; coordinates: number[][] }
      } = {}
      const headers: { [key: string]: number } = {}
      let total = 0

      const transformer = transform((row, callback) => {
        // builds the csv headers for easy access later
        if (Object.keys(headers).length === 0) {
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
          log.info('Parsed', total, 'Points')
        }

        return callback(null)
      })
        .on('finish', () => {
          log.info('Created Shapes. Writing to disk...')
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
          log.info(`${Object.keys(output).length} shapes written to disk!`)
          resolve()
        })
        .on('error', () => {
          reject()
        })

      log.info('Building Shapes')
      input.pipe(parser).pipe(transformer)
    })
  }
  public upload = async (container: string, directory: string) => {
    if (config.shapesSkip === true) {
      log.info('Skipping Shapes Upload.')
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
        // if (process.stdout.clearLine !== undefined) {
        //   process.stdout.clearLine()
        //   process.stdout.cursorTo(0)
        // } else {
        //   process.stdout.write('\n')
        // }
        // process.stdout.write(
        //   ((total / files.length) * 100).toFixed(2) + '% Uploaded',
        // )
      } catch (error) {
        failed += 1
        if (error.toJSON) {
          log.error(error.toJSON())
        } else {
          log.error(error)
        }
      }
    }
    // process.stdout.write('\n')
    log.error(`${container}:`, 'failed upload', failed, 'Shapes.')
    log.info(`${container}:`, 'Upload Complete!', total, 'Shapes.')
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

export default CreateShapes
