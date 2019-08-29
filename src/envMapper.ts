import {
  EnvironmentConfig,
  EnvironmentWorkerConfig,
  EnvironmentImporterConfig,
} from './typings'

class EnvMapper {
  toEnvironmental(
    config: any,
    subset: any
  ): EnvironmentConfig | EnvironmentImporterConfig | EnvironmentWorkerConfig {
    const base = {
      PREFIX: config.prefix,
      VERSION: config.version,
      DB_DATABASE: config.db.database,
      DB_USER: config.db.user,
      DB_PASSWORD: config.db.password,
      DB_SERVER: config.db.server,
      DB_TRANSACTION_LIMIT: config.db.transactionLimit,
      DB_CONNECTION_TIMEOUT: config.db.connectionTimeout,
      DB_REQUEST_TIMEOUT: config.db.requestTimeout,
      STORAGE_SERVICE: config.storageService,
      SHAPES_CONTAINER: config.shapesContainer,
      SHAPES_REGION: config.shapesRegion,
      SHAPES_SKIP: 'true',
      // importer only:
      KEYVALUE: config.keyvalue,
      KEYVALUE_VERSION_TABLE: `${config.keyvaluePrefix}-versions`,
      KEYVALUE_REGION: config.keyvalueRegion,
      EXTENDED: config.prefix === 'au-syd' ? 'true' : 'false',
      // worker only:
      AT_API_KEY: config.api['nz-akl'],
      AGENDA21_API_KEY: config.api['agenda-21'],
      REDIS_PORT: config.redis.port,
      REDIS_HOST: config.redis.host,
      REDIS_FAMILY: config.redis.family,
      REDIS_PASSWORD: config.redis.password,
      REDIS_DB: config.redis.db,

      // needed in importer & worker
      TFNSW_API_KEY: config.api['au-syd'],
    }

    if (subset === 'importer' || subset === 'importer-local') {
      delete base.AT_API_KEY
      delete base.AGENDA21_API_KEY
      if (subset === 'importer') {
        delete base.SHAPES_SKIP
      }
      if (config.prefix !== 'au-syd') {
        delete base.TFNSW_API_KEY
      }
    } else {
      delete base.SHAPES_SKIP
      delete base.KEYVALUE
      delete base.KEYVALUE_VERSION_TABLE
      delete base.KEYVALUE_REGION
      delete base.EXTENDED
    }
    return base
  }

  fromEnvironmental(env: {
    PREFIX: string
    VERSION: string
    STORAGE_SERVICE: string
    SHAPES_CONTAINER: string
    SHAPES_REGION: string
    EMULATED_STORAGE: string
    DB_USER: string
    DB_PASSWORD: string
    DB_SERVER: string
    DB_DATABASE: string
    DB_TRANSACTION_LIMIT: string
    DB_CONNECTION_TIMEOUT: string
    DB_REQUEST_TIMEOUT: string
    AT_API_KEY: string
    AGENDA21_API_KEY: string
    TFNSW_API_KEY: string
    REDIS_PORT: string
    REDIS_HOST: string
    REDIS_FAMILY: string
    REDIS_PASSWORD: string
    REDIS_DB: string
    NEW_REALTIME: string
  }) {
    const {
      PREFIX,
      VERSION,
      STORAGE_SERVICE,
      SHAPES_CONTAINER,
      SHAPES_REGION,
      EMULATED_STORAGE,
      DB_USER,
      DB_PASSWORD,
      DB_SERVER,
      DB_DATABASE,
      DB_TRANSACTION_LIMIT,
      DB_CONNECTION_TIMEOUT,
      DB_REQUEST_TIMEOUT,
      AT_API_KEY,
      AGENDA21_API_KEY,
      TFNSW_API_KEY,
      NEW_REALTIME,
      REDIS_PORT,
      REDIS_HOST,
      REDIS_FAMILY,
      REDIS_PASSWORD,
      REDIS_DB,
    } = env
    return {
      prefix: PREFIX,
      version: VERSION,
      storageService: STORAGE_SERVICE,
      shapesContainer: SHAPES_CONTAINER,
      shapesRegion: SHAPES_REGION,
      newRealtime: NEW_REALTIME === 'true',
      redis: {
        port: parseInt(REDIS_PORT, 10),
        host: REDIS_HOST,
        family: parseInt(REDIS_FAMILY, 10),
        password: REDIS_PASSWORD ? REDIS_PASSWORD : undefined,
        db: REDIS_DB ? parseInt(REDIS_DB, 10) : 0,
      },
      db: {
        user: DB_USER,
        password: DB_PASSWORD,
        server: DB_SERVER,
        database: DB_DATABASE,
        transactionLimit: parseInt(DB_TRANSACTION_LIMIT, 10),
        connectionTimeout: parseInt(DB_CONNECTION_TIMEOUT, 10),
        requestTimeout: parseInt(DB_REQUEST_TIMEOUT, 10),
      },
      api: {
        'nz-akl': AT_API_KEY,
        'agenda-21': AGENDA21_API_KEY,
        'au-syd': TFNSW_API_KEY,
      },
    }
  }
}
export default EnvMapper
