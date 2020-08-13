import 'dotenv/config'
import 'source-map-support/register'
import config from './config'
import connection from './db/connection'
import CreateDb from './db/create'
import Importer from './importers'
import logger from './logger'
import { exhausted, ImportMode } from './types/codec'

const log = logger(config.prefix, config.version)

log.info('Importer Started')


const checkCreated = async () => {
  const sqlRequest = connection.get().request()
  const databaseCreated = await sqlRequest.query<{ dbcreated: number }>(
    `
    select OBJECT_ID('agency', 'U') as 'dbcreated'
    `,
  )
  return !(databaseCreated.recordset[0].dbcreated === null)
}

const start = async () => {
  await connection.open()

  log.info('Connected to Database')
  const created = await checkCreated()
  if (!created) {
    log.info('Building Database from Template')
    const creator = new CreateDb()
    await creator.start()
  }

  log.info('Worker Ready')
  const importer = new Importer({
    keyvalue: config.keyValue,
    keyvalueVersionTable: config.keyValueVersionTable,
    keyvalueRegion: config.keyValueRegion,
  })
  const { mode } = config
  switch (mode) {
    case ImportMode.all:
      log.info('Started import of ALL')
      await importer.start(created)
      break
    case ImportMode.db:
      log.info('Started import of DB')
      await importer.db()
      break
    case ImportMode.shapes:
      log.info('Started import of SHAPES')
      await importer.shapes()
      break
    case ImportMode.unzip:
      log.info('Started UNZIP')
      await importer.unzip()
      break
    case ImportMode.download:
      log.info('Started DOWNLOAD')
      await importer.download()
      break
    case ImportMode.export:
      log.info('Started EXPORT')
      await importer.exportDb()
      break
    case ImportMode.fullshapes:
      log.info('Started FULL SHAPES')
      await importer.fullShapes()
      break
    default:
      throw exhausted(mode)
  }
  log.info(`Completed ${mode.toUpperCase()}`)
  process.exit(0)
}
start()
