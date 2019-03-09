const logger = require('./logger.js')
const KeyvalueLocal = require('./adaptors/keyvalueLocal.js')
const KeyvalueDynamo = require('./adaptors/keyvalueDynamo.js')

class VersionManager {
  constructor(props) {
    const { gateway, config } = props
    this.config = config
    this.gateway = gateway

    if (config.keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({ name: 'waka-versions' })
      this.mappings = new KeyvalueDynamo({ name: 'waka-mappings' })
    } else {
      this.versions = new KeyvalueLocal({ name: 'waka-versions' })
      this.mappings = new KeyvalueLocal({ name: 'waka-mappings' })
    }
  }

  async start() {
    logger.info('Starting Version Manager')

    // load active versions
    const mappingsTable = await this.mappings.scan()
    const mappings = Object.keys(mappingsTable)

    logger.info({ mappings }, `Found ${mappings.length} Mappings`)

    // load data for version
    mappings.forEach(prefix =>
      this.updateGateway(prefix, mappingsTable[prefix])
    )
  }

  async stop() {
    const mappingsTable = await this.mappings.scan()
    const mappings = Object.keys(mappingsTable)
    mappings.forEach(prefix => this.stopGateway(prefix))
  }

  async updateGateway(prefix, versionId) {
    const { gateway, config, versions } = this
    const workerConfig = await versions.get(versionId)

    // the gateway needs some settings from the orchestrator,
    // but also some settings from the worker config
    logger.info({ prefix, version: workerConfig.version }, 'Updating Gateway')
    const gatewayConfig = {
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
    }
    logger.info({ config: gatewayConfig }, 'Gateway Config')
    gateway.start(prefix, gatewayConfig)
  }

  stopGateway(prefix) {
    const { gateway } = this
    logger.info({ prefix }, 'Stopping Gateway')
    gateway.stop(prefix)
  }

  async updateMapping(prefix, versionId) {
    await this.mappings.set(prefix, versionId)
    await this.updateGateway(prefix, versionId)
  }

  async deleteMapping(prefix) {
    this.stopGateway(prefix)
    logger.info({ prefix }, 'Deleting Gateway')
    await this.mappings.delete(prefix)
  }

  async allVersions() {
    // get all versions
    return this.versions.scan()
  }

  async allMappings() {
    // get all mappings
    return this.mappings.scan()
  }
}
module.exports = VersionManager
