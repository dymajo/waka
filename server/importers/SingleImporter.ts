import axios from 'axios'
import { exec } from 'child_process'
import extract from 'extract-zip'
import { createWriteStream, existsSync, mkdirSync, renameSync } from 'fs'
import { join, resolve as _resolve } from 'path'
import rimraf from 'rimraf'
import { promisify } from 'util'
import config from '../config'
import CreateShapes from '../db/create-shapes'
import GtfsImport from '../db/gtfs-import'
import logger from '../logger'
import BaseImporter from './BaseImporter'

const execAsync = promisify(exec)

const log = logger(config.prefix, config.version)

interface SingleImporterProps {
  zipname: string
  url: string
}

abstract class SingleImporter extends BaseImporter {
  zipname: string
  url: string

  zipLocation: string
  downloadOptions: { url: any }
  constructor(props: SingleImporterProps) {
    super()
    const { zipname, url } = props
    this.zipname = zipname
    this.url = url

    this.zipLocation = join(__dirname, `../../cache/${this.zipname}.zip`)
    this.downloadOptions = { url: this.url }
  }

  download = async () => {
    try {
      log.info('Downloading GTFS Data')
      const res = await axios.get(this.downloadOptions.url, {
        responseType: 'stream',
      })
      const dest = createWriteStream(this.zipLocation)
      res.data.pipe(dest)
      await new Promise<void>((resolve, reject) => {
        dest.on('finish', () => {
          log.info('Finished Downloading GTFS Data')
          resolve()
        })
        dest.on('error', reject)
      })
    } catch (error) {
      log.error(error)
    }
  }

  optimize = async () => {
    const { zipLocation } = this
    log.info('Optimizing GTFS Data')
    try {
      const { stdout, stderr } = await execAsync(
        `gtfstidy --compress ${zipLocation} -o ${zipLocation}-compressed.zip`,
      )
      log.info({ stdout, stderr }, 'Optimized feed')
      log.info('Renaming feed')
      renameSync(zipLocation, `${zipLocation}-original.zip`)
      renameSync(`${zipLocation}-compressed.zip`, zipLocation)
      log.info('Renamed feed - will import optimized version')
    } catch (error) {
      log.error({ error }, 'Failed to optimize')
    }
  }

  unzip = async () => {
    log.info('Unzipping GTFS Data')
    const { zipLocation } = this
    return new Promise((resolve, reject) => {
      extract(
        zipLocation,
        {
          dir: _resolve(`${zipLocation}unarchived`),
        },
        err => {
          if (err) reject(err)
          resolve()
        },
      )
    })
  }

  db = async (importer: GtfsImport) => {
    for (const file of this.files) {
      try {
        await importer.upload(
          `${this.zipLocation}unarchived`,
          file,
          config.version,
          file.versioned,
          config.prefix,
        )
      } catch (error) {
        log.error(error)
      }
    }
  }

  shapes = async () => {
    if (!existsSync(this.zipLocation)) {
      log.error('Shapes could not be found!')
      return
    }

    const creator = new CreateShapes()
    const inputDir = _resolve(`${this.zipLocation}unarchived`, 'shapes.txt')
    const outputDir = _resolve(`${this.zipLocation}unarchived`, 'shapes')
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
    await creator.create(inputDir, outputDir, [config.version], config.prefix)

    const containerName = `${config.prefix}-${config.version}`
      .replace('.', '-')
      .replace('_', '-')
    await creator.upload(
      config.shapesContainer || containerName,
      _resolve(outputDir, config.version),
      config.prefix,
    )
  }
}

export default SingleImporter
