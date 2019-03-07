const colors = require('colors')
const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')

const router = require('./router.js')
const connection = require('./db/connection.js')
const log = require('../server-common/logger.js')
const cache = require('./cache')

dotenv.config()

log('Worker Started')

const {
  PREFIX,
  VERSION,
  PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SERVER,
  DB_TRANSACTION_LIMIT,
  DB_CONNECTION_TIMEOUT,
  DB_REQUEST_TIMEOUT,
  STORAGE_SERVICE,
  SHAPES_CONTAINER,
  SHAPES_REGION,
  EMULATED_STORAGE,
} = process.env

global.config = {
  prefix: PREFIX,
  version: VERSION,
  port: PORT,
  storageService: 'aws' || STORAGE_SERVICE,
  shapesContainer: 'shapes-us-west-2.waka.app' || SHAPES_CONTAINER,
  shapesRegion: 'us-west-2' || SHAPES_REGION,
  emulatedStorage: EMULATED_STORAGE || false,
  db: {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_NAME || `${PREFIX}_${VERSION}`,
    transactionLimit: parseInt(DB_TRANSACTION_LIMIT, 10) || 50000,
    connectionTimeout: parseInt(DB_CONNECTION_TIMEOUT, 10) || 60000,
    requestTimeout: parseInt(DB_REQUEST_TIMEOUT, 10) || 60000,
  },
}

log('prefix: '.magenta, global.config.prefix)
log('version:'.magenta, global.config.version)

const app = express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', `waka-${PREFIX}-${VERSION}`)
  next()
})
app.use(router)

const listener = app.listen(PORT, () => {
  global.config.port = listener.address().port
  log('Listening on', global.config.port)
})

const start = async () => {
  await connection.open()
  log('Connected to Database')
  cache.runReady()
}
start()
