const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const request = require('request')
const log = require('../../server-common/logger.js')
const gtfsImport = require('../db/gtfs-import.js')
const createShapes = require('../db/create-shapes.js')

class Importer {
  constructor() {
    this.importer = new gtfsImport()
    this.current = require('./' + global.config.prefix + '.js')
  }
  async start() {
    await this.download()
    await this.importer.unzip(this.current.zipLocation)
    await this.db()
    await this.shapes()
  }
  async db() {
    for (let file of this.current.files) {
      await this.importer.upload(this.current.zipLocation + 'unarchived', file, global.config.version, file.versioned)
    }
  }
  async shapes() {
    const creator = new createShapes()
    const inputDir = path.resolve(this.current.zipLocation + 'unarchived', 'shapes.txt')
    const outputDir = path.resolve(this.current.zipLocation + 'unarchived', 'shapes')
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

    const containerName = (global.config.prefix + '-' + global.config.version).replace('.', '-').replace('_', '-')
    await creator.upload(containerName, path.resolve(outputDir, global.config.version))
  }
  download() {
    return new Promise((resolve, reject) => {
      const url = 'https://atcdn.blob.core.windows.net/data/gtfs.zip'
      log('Downloading GTFS Data from AT')
      const gtfsRequest = request({url: url}).pipe(fs.createWriteStream(this.current.zipLocation))
      gtfsRequest.on('finish', function() {
        log('Finished Downloading GTFS Data')
        resolve()
      })
      gtfsRequest.on('error', reject)
    })
  }
}
module.exports = Importer