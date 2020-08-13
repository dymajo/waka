import axios from 'axios'
import { exec } from 'child_process'
import extract from 'extract-zip'
import { createWriteStream, existsSync, mkdirSync, renameSync } from 'fs'
import { pRateLimit } from 'p-ratelimit'
import { join, resolve as _resolve } from 'path'
import rimraf from 'rimraf'
import { promisify } from 'util'
import config from '../config'
import CreateShapes from '../db/create-shapes'
import GtfsImport from '../db/gtfs-import'
import KeyvalueDynamo from '../db/keyvalue-dynamo'
import Storage from '../db/storage'
import logger from '../logger'
import BaseImporter from './BaseImporter'
const execAsync = promisify(exec)

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
    this.downloadInterval = downloadInterval ?? 2000
    this.batchSize = batchSize ?? 2
    this.versions = null
    this.zipLocations = []
    this.rateLimiter = pRateLimit({
      interval: 1000,
      rate: 5,
      concurrency: 5,
    })

    if (
      keyvalue === 'dynamo' &&
      keyvalueVersionTable !== undefined &&
      keyvalueRegion !== undefined
    ) {
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
      const headers =
        authorization !== undefined ? { Authorization: authorization } : {}
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

  optimize = async () => {
    log.info('Optimizing GTFS Data')
    await Promise.all(
      this.zipLocations.map(async ({ path, name }) => {
        try {
          const { stdout, stderr } = await execAsync(
            `gtfstidy --compress ${path} -o ${path}-compressed.zip`,
          )
          log.info({ path, name, stdout, stderr }, 'Optimized feed')
          log.info({ path, name }, 'Renaming feed')
          renameSync(path, `${path}-original.zip`)
          renameSync(`${path}-compressed.zip`, path)
          log.info(
            { path, name },
            'Renamed feed - will import optimized version',
          )
        } catch (error) {
          log.error({ error }, 'Failed to optimize')
        }
      }),
    )
  }

  unzip = async () => {
    try {
      await Promise.all(
        this.zipLocations.map(async ({ path, name }) => {
          await extract(path, {
            dir: _resolve(`${path}unarchived`),
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
          rimraf(outputDir2, (err) => {
            if (err != null) {
              reject(err)
            }
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
        config.shapesContainer !== '' ? config.shapesContainer : containerName,
        _resolve(outputDir, config.version),
        name,
      )
    }
  }
}

export default MultiImporter
