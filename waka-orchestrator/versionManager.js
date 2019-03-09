const logger = require('./logger.js')
const KeyvalueLocal = require('./adaptors/keyvalueLocal.js')
const KeyvalueDynamo = require('./adaptors/keyvalueDynamo.js')

class VersionManager {
  constructor(props) {
    const { gateway, config } = props
    this.config = config
    this.gateway = gateway

    if (config.keyvalue === 'local') {
      this.versions = new KeyvalueLocal({ name: 'waka-versions' })
      this.mappings = new KeyvalueLocal({ name: 'waka-mappings' })
    } else if (config.keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({ name: 'waka-versions' })
      this.mappings = new KeyvalueDynamo({ name: 'waka-mappings' })
    }
  }

  async start() {
    logger.info('Starting Version Manager')

    // load active versions
    const mappingsTable = await this.mappings.scan()
    const mappings = Object.keys(mappingsTable)

    logger.info({ mappings }, `Found ${mappings.length} Mappings`)

    // load data for version
    mappings.forEach(async prefix => {
      const workerConfig = await this.versions.get(mappingsTable[prefix])
      this.updateGateway(prefix, workerConfig)
    })
  }

  async stop() {
    const { gateway } = this
    const mappingsTable = await this.mappings.scan()
    const mappings = Object.keys(mappingsTable)
    mappings.forEach(prefix => {
      logger.info({ prefix }, 'Stopping Gateway')
      gateway.stop(prefix)
    })
  }

  async updateGateway(prefix, workerConfig) {
    const { gateway, config } = this

    // the gateway needs some settings from the orchestrator,
    // but also some settings from the worker config
    logger.info({ prefix, version: workerConfig.version }, 'Updating Gateway')
    gateway.start(prefix, {
      prefix: workerConfig.prefix,
      version: workerConfig.version,
      storageService: config.storageService,
      shapesContainer: workerConfig.shapesContainer,
      shapesRegion: workerConfig.shapesRegion,
      emulatedStorage: config.emulatedStorage,
      api: config.api,
      db: {
        user: workerConfig.db.user,
        password: workerConfig.db.password,
        server: workerConfig.db.server,
        database: workerConfig.db.database,
        transactionLimit: config.transactionLimit,
        connectionTimeout: config.connectionTimeout,
        requestTimeout: config.requestTimeout,
      },
    })
  }

  async all() {
    // get all versions
    this.versions.scan()
  }
}
module.exports = VersionManager
