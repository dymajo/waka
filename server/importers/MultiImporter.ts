import { existsSync, createWriteStream, mkdirSync, writeFileSync } from 'fs'
import { resolve as _resolve, join } from 'path'
import rimraf from 'rimraf'
import axios from 'axios'
import extract from 'extract-zip'
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
  zipLocations: { p: string; type: string; endpoint: string }[]

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
    const zipLocation = {
      p: join(__dirname, `../../cache/${name}.zip`),
      type,
      endpoint,
    }
    log(config.prefix, 'Downloading GTFS Data', name)
    try {
      const res = await axios.get(endpoint, {
        headers: { Authorization: authorization },
        responseType: 'stream',
      })
      this.zipLocations.push(zipLocation)
      const dest = createWriteStream(zipLocation.p)
      res.data.pipe(dest)
      return new Promise((resolve, reject) => {
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
    function timeout(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }
    log(batchSize, downloadInterval)
    for (let index = 0; index < locations.length; index++) {
      const location = locations[index]
      await this.get(location)
      if (index % batchSize === 0) {
        await timeout(downloadInterval)
      }
    }
  }

  async unzip() {
    try {
      await Promise.all(
        this.zipLocations.map(({ p }) => {
          return new Promise((resolve, reject) => {
            extract(
              p,
              {
                dir: _resolve(`${p}unarchived`),
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
    for (const { p, type, endpoint } of zipLocations) {
      for (const file of files) {
        try {
          await this.importer.upload(
            `${p}unarchived`,
            file,
            config.version,
            file.versioned,
            endpoint,
            true,
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
    for (const { p } of zipLocations) {
      if (!existsSync(p)) {
        log('Shapes could not be found!')
        return
      }
      const inputDir = _resolve(`${p}unarchived`, 'shapes.txt')
      const outputDir = _resolve(`${p}unarchived`, 'shapes')
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
