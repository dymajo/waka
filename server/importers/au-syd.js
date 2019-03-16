const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const sql = require('mssql')
const fetch = require('node-fetch')

const log = require('../logger.js')
const GtfsImport = require('../db/gtfs-import.js')
const CreateShapes = require('../db/create-shapes.js')
const connection = require('../db/connection.js')
const Storage = require('../db/storage.js')
const KeyvalueDynamo = require('../db/keyvalue-dynamo.js')

const batch1 = {
  buses1: { endpoint: 'buses/SMBSC001', type: 'bus' },
  buses2: { endpoint: 'buses/SMBSC002', type: 'bus' },
  buses3: { endpoint: 'buses/SMBSC003', type: 'bus' },
  buses4: { endpoint: 'buses/SMBSC004', type: 'bus' },
  busse5: { endpoint: 'buses/SMBSC005', type: 'bus' },
  buses6: { endpoint: 'buses/SBSC006', type: 'bus' },
  buses7: { endpoint: 'buses/SMBSC007', type: 'bus' },
  buses8: { endpoint: 'buses/SMBSC008', type: 'bus' },
}
const batch2 = {
  buses9: { endpoint: 'buses/SMBSC009', type: 'bus' },
  buses10: { endpoint: 'buses/SMBSC010', type: 'bus' },
  buses11: { endpoint: 'buses/SMBSC012', type: 'bus' },
  buses12: { endpoint: 'buses/SMBSC013', type: 'bus' },
  buses13: { endpoint: 'buses/SMBSC014', type: 'bus' },
  buses14: { endpoint: 'buses/SMBSC015', type: 'bus' },
  buses15: { endpoint: 'buses/OSMBSC001', type: 'bus' },
  buses16: { endpoint: 'buses/OSMBSC002', type: 'bus' },
}
const batch3 = {
  buses17: { endpoint: 'buses/OSMBSC003', type: 'bus' },
  buses18: { endpoint: 'buses/OSMBSC004', type: 'bus' },
  buses19: { endpoint: 'buses/OSMBSC006', type: 'bus' },
  buses20: { endpoint: 'buses/OSMBSC007', type: 'bus' },
  buses21: { endpoint: 'buses/OSMBSC008', type: 'bus' },
  buses22: { endpoint: 'buses/OSMBSC009', type: 'bus' },
  buses23: { endpoint: 'buses/OSMBSC010', type: 'bus' },
  buses24: { endpoint: 'buses/OSMBSC011', type: 'bus' },
}
const batch4 = {
  buses25: { endpoint: 'buses/OSMBSC012', type: 'bus' },
  buses26: { endpoint: 'buses/NISC001', type: 'bus' },
  buses27: { endpoint: 'buses/ECR109', type: 'bus' },
  ferries: { endpoint: 'ferries', type: 'ferry' },
  lightrail1: { endpoint: 'lightrail/innerwest', type: 'lightrail' },
  lightrail2: { endpoint: 'lightrail/newcastle', type: 'lightrail' },
  trains1: { endpoint: 'nswtrains', type: 'train' },
  trains2: { endpoint: 'sydneytrains', type: 'train' },
}
const files = [
  {
    name: 'agency.txt',
    table: 'agency',
    versioned: false,
  },
  {
    name: 'stops.txt',
    table: 'stops',
    versioned: false,
  },
  {
    name: 'routes.txt',
    table: 'routes',
    versioned: false,
  },
  {
    name: 'trips.txt',
    table: 'trips',
    versioned: false,
  },
  {
    name: 'stop_times.txt',
    table: 'stop_times',
    versioned: false,
  },
  {
    name: 'calendar.txt',
    table: 'calendar',
    versioned: false,
  },
  {
    name: 'calendar_dates.txt',
    table: 'calendar_dates',
    versioned: false,
  },
]
const shapeFile = 'shapes.txt'

class TfNSWImporter {
  constructor(props) {
    this.importer = new GtfsImport()
    this.storage = new Storage({})

    const { keyvalue, keyvalueVersionTable, keyvalueRegion } = props
    this.versions = null
    this.zipLocations = []
    if (keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({
        name: keyvalueVersionTable,
        region: keyvalueRegion,
      })
    }
    this.start = this.start.bind(this)
    this.get = this.get.bind(this)
    this.download = this.download.bind(this)
    this.unzip = this.unzip.bind(this)
    this.fixStopCodes = this.fixStopCodes.bind(this)
    this.shapes = this.shapes.bind(this)
  }

  async start(created = false) {
    // if (!created) {
    await this.download()
    await this.unzip()
    await this.db()
    // } else {
    // console.warn('DB already created - skipping download & unzip.')
    // }
    // await this.shapes()
    await this.fixStopCodes()
  }

  async get(batch) {
    return Promise.all(
      Object.keys(batch).map(async mode => {
        const { endpoint, type } = batch[mode]

        const zipLocation = {
          p: path.join(__dirname, `../../cache/${mode}.zip`),
          type,
          endpoint,
        }
        this.zipLocations.push(zipLocation)
        log(global.config.prefix.magenta, 'Downloading GTFS Data')
        try {
          const res = await fetch(
            `https://api.transport.nsw.gov.au/v1/gtfs/schedule/${endpoint}`,
            {
              headers: {
                Authorization: process.env.API_KEY,
              },
            }
          )
          if (res.ok) {
            await new Promise((resolve, reject) => {
              const dest = fs.createWriteStream(zipLocation.p)
              res.body.pipe(dest)
              res.body.on('error', err => {
                reject(err)
              })
              dest.on('finish', () => {
                resolve()
              })
            })
            log('Finished Downloading GTFS Data')
          } else {
            console.log(res)
            throw Error(res.statusText)
          }
        } catch (err) {
          console.log(err)
        }
      })
    )
  }

  async download() {
    function timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    await this.get(batch1)
    await timeout(2000)
    await this.get(batch2)
    await timeout(2000)
    await this.get(batch3)
    await timeout(2000)
    await this.get(batch4)
  }

  async unzip() {
    const promises = []
    for (const { p } of this.zipLocations) {
      promises.push(this.importer.unzip(p))
    }
    try {
      await Promise.all(promises)
    } catch (error) {
      log('fatal error'.red, error)
    }
  }

  async db() {
    const { zipLocations } = this
    for (const { p, type, endpoint } of zipLocations) {
      for (const file of files) {
        try {
          await this.importer.upload(
            `${p}unarchived`,
            file,
            global.config.version,
            file.versioned,
            endpoint,
            true
          )
        } catch (error) {
          console.error(error)
        }
      }
    }
  }

  async shapes() {
    const { zipLocations } = this
    for (const { p } of zipLocations) {
      if (!fs.existsSync(p)) {
        console.warn('Shapes could not be found!')
        return
      }
      const creator = new CreateShapes()
      const inputDir = path.resolve(`${p}unarchived`, 'shapes.txt')
      const outputDir = path.resolve(`${p}unarchived`, 'shapes')
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

      const containerName = `${global.config.prefix}-${global.config.version}`
        .replace('.', '-')
        .replace('_', '-')
      await creator.upload(
        global.config.shapesContainer,
        path.resolve(outputDir, global.config.version)
      )
    }
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
      `${global.config.prefix} ${global.config.version}`.magenta,
      `Updated ${rows} null stop codes`
    )
  }
}

module.exports = TfNSWImporter
