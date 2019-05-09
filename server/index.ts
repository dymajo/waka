import 'dotenv/config'
import connection from './db/connection'
import CreateDb from './db/create'
import log from './logger'
import Importer from './importers'
import config from './config'

log('Importer Started')

const sydney = config.prefix === 'au-syd'
Object.keys(config).forEach(key => {
  if (config.tfnswApiKey === undefined && sydney) {
    throw new Error('no api key for sydney')
  }
  if (
    config[key] === undefined &&
    key !== 'keyValue' &&
    key !== 'keyValueVersionTable' &&
    key !== 'keyValueRegion' &&
    key !== 'tfnswApiKey'
  ) {
    throw new Error(`Variable ${key} was undefined.`)
  }
  return true
})

log('prefix: ', config.prefix)
log('version:', config.version)

const checkCreated = async () => {
  const sqlRequest = connection.get().request()
  const databaseCreated = await sqlRequest.query<{ dbcreated: number }>(
    `
    select OBJECT_ID('agency', 'U') as 'dbcreated'
    `
  )
  return !(databaseCreated.recordset[0].dbcreated === null)
}

const start = async () => {
  await connection.open()

  log('Connected to Database')
  const created = await checkCreated()
  if (!created) {
    log('Building Database from Template')
    const creator = new CreateDb()
    await creator.start()
  }

  log('Worker Ready')
  const importer = new Importer({
    keyvalue: config.keyValue,
    keyvalueVersionTable: config.keyValueVersionTable,
    keyvalueRegion: config.keyValueRegion,
  })
  const { mode } = config
  switch (mode) {
    case 'all':
      log('Started import of ALL')
      await importer.start(created)
      break
    case 'db':
      log('Started import of DB')
      await importer.db()
      break
    case 'shapes':
      log('Started import of SHAPES')
      await importer.shapes()
      break
    case 'unzip':
      log('Started UNZIP')
      await importer.unzip()
      break
    case 'download':
      log('Started DOWNLOAD')
      await importer.download()
      break
    case 'export':
      log('Started EXPORT')
      await importer.exportDb()
      break
    default:
      break
  }
  log(`Completed ${mode.toUpperCase()}`)
  process.exit(0)
}
start()
