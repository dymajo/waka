import extract from 'extract-zip'
import { existsSync, mkdirSync } from 'fs'
import { join, resolve as _resolve } from 'path'
import rimraf from 'rimraf'
import config from '../config'
import CreateShapes from '../db/create-shapes'
import GtfsImport from '../db/gtfs-import'
import logger from '../logger'
import BaseImporter from './BaseImporter'

const log = logger(config.prefix, config.version)
interface LocalImporterProps {
  zipname: string
}

class LocalImporter extends BaseImporter {
  zipname: string

  zipLocation: string
  constructor(props: LocalImporterProps) {
    super()
    const { zipname } = props
    this.zipname = zipname

    this.zipLocation = join(__dirname, `../../cache/${this.zipname}.zip`)
  }

  optimize = async () => {
    log.info('Optimization Skipped - Need to figure out bugs.')
    // if (this.current) await this.current.optimize()
  }
  download = async () => {
    return new Promise<void>((resolve, reject) => {
      const exists = existsSync(this.zipLocation)
      if (exists) {
        return resolve()
      }
      return reject()
    })
  }

  unzip = async () => {
    log.info('Unzipping GTFS Data')
    const { zipLocation } = this
    await extract(zipLocation, {
      dir: _resolve(`${zipLocation}unarchived`),
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
    await creator.create(inputDir, outputDir, [config.version], config.prefix)

    const containerName = `${config.prefix}-${config.version}`
      .replace('.', '-')
      .replace('_', '-')
    await creator.upload(
      config.shapesContainer !== '' ? config.shapesContainer : containerName,
      _resolve(outputDir, config.version),
      config.prefix,
    )
  }
}

export default LocalImporter
