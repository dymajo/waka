import { ImportMode, KeyValue, Prefix, StorageService } from './codec'

export interface WakaConfig {
  prefix: Prefix
  version: string
  mode: ImportMode
  storageService: StorageService
  shapesContainer: string
  shapesRegion: string
  shapesSkip: boolean
  emulatedStorage: boolean
  local?: boolean
  keyValue: KeyValue | undefined
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
    DB_DATABASE?: string
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
