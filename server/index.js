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
  DB_DATABASE,
  DB_TRANSACTION_LIMIT,
  DB_CONNECTION_TIMEOUT,
  DB_REQUEST_TIMEOUT,
  MODE,
} = process.env

global.config = {
  prefix: PREFIX,
  version: VERSION,
  dbname: DB_NAME,
  mode: MODE || 'all',
  db: {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_DATABASE,
    transactionLimit: parseInt(DB_TRANSACTION_LIMIT, 10),
    connectionTimeout: parseInt(DB_CONNECTION_TIMEOUT, 10),
    requestTimeout: parseInt(DB_REQUEST_TIMEOUT, 10),
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
  await connection.isReady

  log('Connected to Database')
  const dbName = global.config.db.database

  const sqlRequest = connection.get().request()
  sqlRequest.input('name', sql.VarChar, dbName)

  await sqlRequest.query(`
    IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = @name)
    EXEC('CREATE DATABASE '+ @name)`)

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
