import { existsSync, createWriteStream, mkdirSync } from 'fs'
import { resolve as _resolve, join } from 'path'
import rimraf from 'rimraf'
import axios from 'axios'
import extract from 'extract-zip'
import { pRateLimit } from 'p-ratelimit'
import logger from '../logger'
import GtfsImport from '../db/gtfs-import'
import CreateShapes from '../db/create-shapes'
import Storage from '../db/storage'
import KeyvalueDynamo from '../db/keyvalue-dynamo'
import config from '../config'
import BaseImporter from './BaseImporter'

const log = logger(config.prefix, config.version)

interface MultiImporterProps {
  keyvalue?: string
  keyvalueVersionTable?: string
  keyvalueRegion?: string
  locations: { endpoint: string; type: string; name: string }[]
  downloadInterval?: number
  batchSize?: number
  authorization?: string
}

abstract class MultiImporter extends BaseImporter {
  locations: { endpoint: string; name: string; type: string }[]
  authorization?: string
  importer: GtfsImport
  storage: Storage
  downloadInterval: number
  batchSize: number
  versions: KeyvalueDynamo | null
  zipLocations: { path: string; type: string; name: string }[]
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>

  constructor(props: MultiImporterProps) {
    super()
    const {
      keyvalue,
      keyvalueVersionTable,
      keyvalueRegion,
      locations,
      downloadInterval,
      batchSize,
      authorization,
    } = props

    this.locations = locations
    this.authorization = authorization
    this.importer = new GtfsImport()
    this.storage = new Storage({})
    this.downloadInterval = downloadInterval || 2000
    this.batchSize = batchSize || 2
    this.versions = null
    this.zipLocations = []
    this.rateLimiter = pRateLimit({
      interval: 1000,
      rate: 5,
      concurrency: 5,
    })

    if (keyvalue === 'dynamo' && keyvalueVersionTable && keyvalueRegion) {
      this.versions = new KeyvalueDynamo({
        name: keyvalueVersionTable,
        region: keyvalueRegion,
      })
    }
  }

  get = async (location: { endpoint: string; type: string; name: string }) => {
    const { endpoint, type, name } = location
    const { authorization } = this
    log.info(name, 'Starting download')
    try {
      const headers = authorization ? { Authorization: authorization } : {}
      const res = await axios.get(endpoint, {
        headers,
        responseType: 'stream',
      })
      const zipLocation = {
        path: join(__dirname, `../../cache/${name}.zip`),
        type,
        name,
      }
      // const contentDisposition = res.headers['content-disposition']
      // const resfilename = contentDisposition
      //   ? contentDisposition.split('filename=')[1].replace('.zip', '')
      //   : null
      // if (resfilename) {
      //   zipLocation.path = join(__dirname, `../../cache/${resfilename}.zip`)
      // }
      this.zipLocations.push(zipLocation)
      const dest = createWriteStream(zipLocation.path)
      res.data.pipe(dest)
      await new Promise<void>((resolve, reject) => {
        dest.on('finish', () => {
          log.info(name, 'Downloaded')
          resolve()
        })
        dest.on('error', reject)
      })
    } catch (err) {
      log.error(err)
    }
  }

  download = async () => {
    const { downloadInterval, locations, batchSize } = this

    log.info(batchSize, downloadInterval)
    for (let index = 0; index < locations.length; index++) {
      const location = locations[index]
      await this.rateLimiter(() => this.get(location))
    }
  }

  unzip = async () => {
    try {
      await Promise.all(
        this.zipLocations.map(({ path, name }) => {
          return new Promise((resolve, reject) => {
            extract(
              path,
              {
                dir: _resolve(`${path}unarchived`),
              },
              err => {
                if (err) reject(err)
                log.info(name, 'unzipped')
                resolve()
              },
            )
          })
        }),
      )
    } catch (error) {
      log.error('fatal error', error)
    }
  }

  db = async () => {
    const { zipLocations, files } = this
    for (const { path, name } of zipLocations) {
      for (const file of files) {
        let merge = true
        if (file.table === 'transfers') {
          merge = false
        }
        try {
          await this.importer.upload(
            `${path}unarchived`,
            file,
            config.version,
            file.versioned,
            name,
            merge,
          )
        } catch (error) {
          log.error(error)
        }
      }
    }
  }

  shapes = async () => {
    const { zipLocations } = this
    const creator = new CreateShapes()
    for (const { path, name } of zipLocations) {
      if (!existsSync(path)) {
        log.error('Shapes could not be found!')
        return
      }
      const inputDir = _resolve(`${path}unarchived`, 'shapes.txt')
      const outputDir = _resolve(`${path}unarchived`, 'shapes')
      const outputDir2 = _resolve(outputDir, config.version)

      // make sure the old output dir exists
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir)
      }

      // cleans up old import if exists
      if (existsSync(outputDir2)) {
        await new Promise<void>((resolve, reject) => {
          rimraf(outputDir2, err => {
            if (err) reject(err)
            resolve()
          })
        })
      }
      mkdirSync(outputDir2)

      // creates the new datas
      await creator.create(inputDir, outputDir, [config.version], name)

      const containerName = `${config.prefix}-${config.version}`
        .replace('.', '-')
        .replace('_', '-')
      await creator.upload(
        config.shapesContainer || containerName,
        _resolve(outputDir, config.version),
        name,
      )
    }
  }
}

export default MultiImporter
