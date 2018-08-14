const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const log = require('../logger.js')
const gtfsImport = require('../db/gtfs-import.js')
const createShapes = require('../db/create-shapes.js')
const connection = require('../db/connection.js')

class Importer {
  constructor() {
    this.importer = new gtfsImport()
    this.current = null
    try {
      this.current = require('./regions/' + global.config.prefix + '.js')
    } catch (err) {
      log(
        'fatal error'.red,
        'Could not find an importer in ',
        path.join(__dirname, './regions', global.config.prefix + '.js')
      )
    }
  }
  async start() {
    if (!this.current) {
      return
    }

    await this.download()
    await this.unzip()
    await this.db()
    await this.shapes()
    await this.fixStopCodes()
    await this.postImport()
  }

  async unzip() {
    await this.importer.unzip(this.current.zipLocation)
  }

  async download() {
    await this.current.download()
  }

  async db() {
    for (let file of this.current.files) {
      await this.importer.upload(
        this.current.zipLocation + 'unarchived',
        file,
        global.config.version,
        file.versioned
      )
    }
  }
  async shapes() {
    const creator = new createShapes()
    const inputDir = path.resolve(
      this.current.zipLocation + 'unarchived',
      'shapes.txt'
    )
    const outputDir = path.resolve(
      this.current.zipLocation + 'unarchived',
      'shapes'
    )
    const outputDir2 = path.resolve(outputDir, global.config.version)

    // make sure the old output dir exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir)
    }

    // cleans up old import if exists
    if (fs.existsSync(outputDir2)) {
      await new Promise((resolve, reject) => {
        rimraf(outputDir2, resolve)
      })
    }
    fs.mkdirSync(outputDir2)

    // creates the new datas
    await creator.create(inputDir, outputDir, [global.config.version])

    const containerName = (global.config.prefix + '-' + global.config.version)
      .replace('.', '-')
      .replace('_', '-')
    await creator.upload(
      containerName,
      path.resolve(outputDir, global.config.version)
    )
  }
  async fixStopCodes() {
    // GTFS says it's optional, but Waka uses stop_code for stop lookups
    const sqlRequest = connection.get().request()
    const res = await sqlRequest.query(`
      UPDATE stops
      SET stop_code = stop_id
      WHERE stop_code is null;
    `)
    const rows = res.rowsAffected[0]
    log(
      (global.config.prefix + ' ' + global.config.version).magenta,
      `Updated ${rows} null stop codes`
    )
  }
  async postImport() {
    if (this.current.postImport) {
      await this.current.postImport()
    }
  }
}
module.exports = Importer
