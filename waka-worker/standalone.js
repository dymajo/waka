const Express = require('express')
const dotenv = require('dotenv')
const bodyParser = require('body-parser')
const WakaWorker = require('./index.js')

dotenv.config()

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

const app = new Express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', `waka-worker-${PREFIX}-${VERSION}`)
  next()
})
const worker = new WakaWorker({
  prefix: PREFIX,
  version: VERSION,
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
})
app.use(worker.router)

const listener = app.listen(PORT, () => {
  worker.logger.info({ port: listener.address().port }, 'waka-worker listening')
  worker.start()
})
