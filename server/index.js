const sql = require('mssql')
const dotenv = require('dotenv')

const connection = require('./db/connection.js')
const CreateDb = require('./db/create.js')
const log = require('./logger.js')
const Importers = require('./importers/index')

dotenv.config()

log('Importer Started')

const {
  PREFIX,
  VERSION,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SERVER,
  DB_MASTER_DATABASE,
  DB_TRANSACTION_LIMIT,
  DB_CONNECTION_TIMEOUT,
  DB_REQUEST_TIMEOUT,
  MODE,
  STORAGE_SERVICE,
  SHAPES_CONTAINER,
  SHAPES_REGION,
  EMULATED_STORAGE,
} = process.env

global.config = {
  prefix: PREFIX,
  version: VERSION,
  mode: MODE || 'all',
  storageService: 'aws' || STORAGE_SERVICE,
  shapesContainer: 'shapes-us-west-2.waka.app' || SHAPES_CONTAINER,
  shapesRegion: 'us-west-2' || SHAPES_REGION,
  emulatedStorage: EMULATED_STORAGE || false,
  db: {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_NAME || `${PREFIX}_${VERSION}`,
    master_database: DB_MASTER_DATABASE || 'master',
    transactionLimit: parseInt(DB_TRANSACTION_LIMIT, 10) || 50000,
    connectionTimeout: parseInt(DB_CONNECTION_TIMEOUT, 10) || 60000,
    requestTimeout: parseInt(DB_REQUEST_TIMEOUT, 10) || 60000,
  },
}

Object.keys(global.config).forEach(key => {
  if (global.config[key] === undefined) {
    throw new Error(`Variable ${key} was undefined.`)
  }
  return true
})

log('prefix: '.magenta, global.config.prefix)
log('version:'.magenta, global.config.version)

const start = async () => {
  await connection.open()

  log('Connected to Database')
  const sqlRequest = connection.get().request()
  const databaseCreated = await sqlRequest.query(
    `
      select OBJECT_ID('agency', 'U') as 'dbcreated'
    `
  )

  if (databaseCreated.recordset[0].dbcreated === null) {
    log('Building Database from Template')
    const creator = new CreateDb()
    await creator.start()
  }

  log('Worker Ready')

  const importer = new Importers()
  const { mode } = global.config

  if (mode === 'all') {
    log('Started import of ALL')
    await importer.start()
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
