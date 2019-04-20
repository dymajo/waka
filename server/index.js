require('dotenv').config()
const connection = require('./db/connection.js')
const CreateDb = require('./db/create.js')
const log = require('./logger.js')
const Importer = require('./importers/index')
const TfNSWImporter = require('./importers/regions/au-syd')
const config = require('./config')

log('Importer Started')

Object.keys(config).forEach(key => {
  if (config[key] === undefined) {
    throw new Error(`Variable ${key} was undefined.`)
  }
  return true
})

log('prefix: '.magenta, config.prefix)
log('version:'.magenta, config.version)

const start = async () => {
  await connection.open()

  log('Connected to Database')
  const sqlRequest = connection.get().request()
  const databaseCreated = await sqlRequest.query(
    `
      select OBJECT_ID('agency', 'U') as 'dbcreated'
    `
  )
  const created = !(databaseCreated.recordset[0].dbcreated === null)
  if (!created) {
    log('Building Database from Template')
    const creator = new CreateDb()
    await creator.start()
  }

  log('Worker Ready')
  let importer
  if (config.prefix === 'au-syd') {
    importer = new TfNSWImporter({
      keyvalue: config.keyValue,
      keyvalueVersionTable: config.keyValueVersionTable,
      keyvalueRegion: config.keyValueRegion,
    })
  } else {
    importer = new Importer({
      keyvalue: config.keyValue,
      keyvalueVersionTable: config.keyValueVersionTable,
      keyvalueRegion: config.keyValueRegion,
    })
  }
  const { mode } = config
  if (mode === 'all') {
    log('Started import of ALL')
    await importer.start(created)
  } else if (mode === 'db') {
    log('Started import of DB')
    await importer.db()
  } else if (mode === 'shapes') {
    log('Started import of SHAPES')
    await importer.shapes()
  } else if (mode === 'unzip') {
    log('Started UNZIP')
    await importer.unzip()
  } else if (mode === 'download') {
    log('Started DOWNLOAD')
    await importer.download()
  } else if (mode === 'export') {
    log('Started EXPORT')
    await importer.exportDb()
  }
  log(`Completed ${mode.toUpperCase()}`)
  process.exit(0)
}
start()
