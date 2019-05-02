require('dotenv').config()

const {
  PREFIX,
  VERSION,
  KEYVALUE,
  KEYVALUE_VERSION_TABLE,
  KEYVALUE_REGION,
  DB_DATABASE,
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
  SHAPES_SKIP,
  EMULATED_STORAGE,
  TFNSW_API_KEY,
} = process.env

const config = {
  prefix: PREFIX,
  version: VERSION,
  mode: MODE || 'all',
  storageService: STORAGE_SERVICE || 'aws',
  shapesContainer: SHAPES_CONTAINER || 'shapes-us-west-2.waka.app',
  shapesRegion: SHAPES_REGION || 'us-west-2',
  shapesSkip: SHAPES_SKIP === 'true' || false,
  emulatedStorage: EMULATED_STORAGE === 'true' || false,
  keyValue: KEYVALUE,
  keyValueVersionTable: KEYVALUE_VERSION_TABLE,
  keyValueRegion: KEYVALUE_REGION,
  tfnswApiKey: TFNSW_API_KEY,
  db: {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_DATABASE || `${PREFIX}_${VERSION}`,
    master_database: DB_MASTER_DATABASE || 'master',
    transactionLimit: parseInt(DB_TRANSACTION_LIMIT, 10) || 50000,
    connectionTimeout: parseInt(DB_CONNECTION_TIMEOUT, 10) || 60000,
    requestTimeout: parseInt(DB_REQUEST_TIMEOUT, 10) || 60000,
  },
}

module.exports = config
