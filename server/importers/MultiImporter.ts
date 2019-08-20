import { existsSync, createWriteStream, mkdirSync } from 'fs'
import { resolve as _resolve, join } from 'path'
import rimraf from 'rimraf'
import axios from 'axios'
import extract from 'extract-zip'
import { pRateLimit } from 'p-ratelimit'
import log from '../logger'
import GtfsImport from '../db/gtfs-import'
import CreateShapes from '../db/create-shapes'
import Storage from '../db/storage'
import KeyvalueDynamo from '../db/keyvalue-dynamo'
import config from '../config'
import BaseImporter from './BaseImporter'

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
  versions: KeyvalueDynamo
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

    if (keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({
        name: keyvalueVersionTable,
        region: keyvalueRegion,
      })
    }
  }

  async get(location: { endpoint: string; type: string; name: string }) {
    const { endpoint, type, name } = location
    const { authorization } = this
    log(config.prefix, 'Downloading GTFS Data', name)
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
      const resfilename = res.headers['content-disposition']
        .split('filename=')[1]
        .replace('.zip', '')
      if (resfilename) {
        zipLocation.path = join(__dirname, `../../cache/${resfilename}.zip`)
      }
      this.zipLocations.push(zipLocation)
      const dest = createWriteStream(zipLocation.path)
      res.data.pipe(dest)
      return new Promise<void>((resolve, reject) => {
        dest.on('finish', () => {
          log(config.prefix, 'Finished Downloading GTFS Data', name)
          resolve()
        })
        dest.on('error', reject)
      })
    } catch (err) {
      log(err)
    }
  }

  async download() {
    const { downloadInterval, locations, batchSize } = this

    log(batchSize, downloadInterval)
    for (let index = 0; index < locations.length; index++) {
      const location = locations[index]
      await this.rateLimiter(() => this.get(location))
    }
  }

  async unzip() {
    try {
      await Promise.all(
        this.zipLocations.map(({ path }) => {
          return new Promise((resolve, reject) => {
            extract(
              path,
              {
                dir: _resolve(`${path}unarchived`),
              },
              err => {
                if (err) reject(err)
                resolve()
              },
            )
          })
        }),
      )
    } catch (error) {
      log('fatal error', error)
    }
  }

  async db() {
    const { zipLocations, files } = this
    for (const { path, type, name } of zipLocations) {
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
          log(error)
        }
      }
    }
  }

  async shapes() {
    const { zipLocations } = this
    const creator = new CreateShapes()
    for (const { path } of zipLocations) {
      if (!existsSync(path)) {
        log('Shapes could not be found!')
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
        await new Promise((resolve, reject) => {
          rimraf(outputDir2, resolve)
        })
      }
      mkdirSync(outputDir2)

      // creates the new datas
      await creator.create(inputDir, outputDir, [config.version])

      const containerName = `${config.prefix}-${config.version}`
        .replace('.', '-')
        .replace('_', '-')
      await creator.upload(
        config.shapesContainer,
        _resolve(outputDir, config.version),
      )
    }
  }
}

export default MultiImporter
