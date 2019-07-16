import 'dotenv/config'

export interface WakaConfig {
  prefix: string
  version: string
  mode: 'all' | 'db' | 'shapes' | 'unzip' | 'download' | 'export' | 'fullshapes'
  storageService: 'aws' | 'local'
  shapesContainer: string
  shapesRegion: string
  shapesSkip: boolean
  emulatedStorage: boolean
  local?: boolean
  keyValue?: 'dynamo'
  keyValueVersionTable?: string
  keyValueRegion?: string
  tfnswApiKey?: string
  extended: boolean
  localImport?: boolean
  localFile?: string
  db: {
    user: string
    password: string
    server: string
    database: string
    masterDatabase: string
    transactionLimit: number
    connectionTimeout: number
    requestTimeout: number
  }
}

declare const process: {
  env: {
    PREFIX: string
    MODE?:
      | 'all'
      | 'db'
      | 'shapes'
      | 'unzip'
      | 'download'
      | 'export'
      | 'fullshapes'
    VERSION: string
    KEYVALUE?: 'dynamo'
    KEYVALUE_VERSION_TABLE?: string
    KEYVALUE_REGION?: string
    DB_DATABASE: string
    DB_USER: string
    DB_PASSWORD: string
    DB_SERVER: string
    DB_MASTER_DATABASE?: string
    DB_TRANSACTION_LIMIT?: string
    DB_CONNECTION_TIMEOUT?: string
    DB_REQUEST_TIMEOUT?: string
    STORAGE_SERVICE?: 'aws' | 'local'
    SHAPES_CONTAINER?: string
    SHAPES_REGION?: string
    SHAPES_SKIP?: string
    EMULATED_STORAGE?: string
    TFNSW_API_KEY?: string
    EXTENDED?: string
    LOCAL_IMPORT?: string
    LOCAL_FILE?: string
  }
}

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
  EXTENDED,
  LOCAL_FILE,
  LOCAL_IMPORT,
} = process.env

const config: WakaConfig = {
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
  extended: EXTENDED === 'true' || false,
  localFile: LOCAL_FILE || null,
  localImport: LOCAL_IMPORT === 'true' || false,
  db: {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_DATABASE || `${PREFIX}_${VERSION}`,
    masterDatabase: DB_MASTER_DATABASE || 'master',
    transactionLimit: DB_TRANSACTION_LIMIT
      ? parseInt(DB_TRANSACTION_LIMIT, 10)
      : 50000,
    connectionTimeout: DB_CONNECTION_TIMEOUT
      ? parseInt(DB_CONNECTION_TIMEOUT, 10)
      : 60000,
    requestTimeout: DB_REQUEST_TIMEOUT
      ? parseInt(DB_REQUEST_TIMEOUT, 10)
      : 60000,
  },
}

export default config
