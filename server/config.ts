import 'dotenv/config'
import requireEnv from 'require-env'
import { WakaConfig } from './types'
import {
  decodeOrNull,
  decodeOrThrow,
  ImportMode,
  ImportModeCodec,
  KeyValueCodec,
  PrefixCodec,
  StorageService,
  StorageServiceCodec,
} from './types/codec'

const mode: ImportMode =
  decodeOrNull(ImportModeCodec, process.env.MODE) ?? ImportMode.all
const prefix = decodeOrThrow(PrefixCodec, process.env.PREFIX)
const version = requireEnv.require('VERSION')
const shapesContainer =
  process.env.SHAPES_CONTAINER ?? 'shapes-us-west-2.waka.app'
const shapesRegion = process.env.SHAPES_REGION ?? 'us-west-2'
const shapesSkip = process.env.SHAPES_SKIP === 'true'
const emulatedStorage = process.env.EMULATED_STORAGE === 'true'
const keyValue = decodeOrNull(KeyValueCodec, process.env.KEYVALUE) ?? undefined
const storageService: StorageService =
  decodeOrNull(StorageServiceCodec, process.env.STORAGE_SERVICE) ??
  StorageService.aws
const keyValueVersionTable = process.env.KEYVALUE_VERSION_TABLE
const keyValueRegion = process.env.KEYVALUE_REGION
const tfnswApiKey = process.env.TFNSW_API_KEY
const extended = process.env.EXTENDED === 'true'
const localFile = process.env.LOCAL_FILE
const localImport = process.env.LOCAL_IMPORT === 'true'
const dbUser = requireEnv.require('DB_USER')
const dbPassword = requireEnv.require('DB_PASSWORD')
const dbServer = requireEnv.require('DB_SERVER')
const dbDatabase = process.env.DB_DATABASE ?? `${prefix}_${version}`
const dbMasterDatabase = process.env.DB_MASTER_DATABASE ?? 'master'
const dbTransactionLimit =
  process.env.DB_TRANSACTION_LIMIT !== undefined
    ? parseInt(process.env.DB_TRANSACTION_LIMIT, 10)
    : 50000
const dbConnectionTimeout =
  process.env.DB_CONNECTION_TIMEOUT !== undefined
    ? parseInt(process.env.DB_CONNECTION_TIMEOUT, 10)
    : 60000
const dbRequestTimeout =
  process.env.DB_REQUEST_TIMEOUT !== undefined
    ? parseInt(process.env.DB_REQUEST_TIMEOUT, 10)
    : 60000

const config: WakaConfig = {
  prefix,
  version,
  mode,
  storageService,
  shapesContainer,
  shapesRegion,
  shapesSkip,
  emulatedStorage,
  keyValue,
  keyValueVersionTable,
  keyValueRegion,
  tfnswApiKey,
  extended,
  localFile,
  localImport,
  db: {
    user: dbUser,
    password: dbPassword,
    server: dbServer,
    database: dbDatabase,
    masterDatabase: dbMasterDatabase,
    transactionLimit: dbTransactionLimit,
    connectionTimeout: dbConnectionTimeout,
    requestTimeout: dbRequestTimeout,
  },
}

export default config
