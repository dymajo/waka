class EnvMapper {
  toEnvironental(config) {
    return 'not implemented'
  }

  fromEnvironmental(env) {
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
    } = env
    return {
      prefix: PREFIX,
      version: VERSION,
      storageService: STORAGE_SERVICE,
      shapesContainer: SHAPES_CONTAINER,
      shapesRegion: SHAPES_REGION,
      emulatedStorage: EMULATED_STORAGE === 'true',
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
      },
    }
  }
}
module.exports = EnvMapper
