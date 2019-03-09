const logger = require('./logger.js')
const KeyvalueLocal = require('./adaptors/keyvalueLocal.js')
const KeyvalueDynamo = require('./adaptors/keyvalueDynamo.js')
const EnvMapper = require('../envMapper.js')

class VersionManager {
  constructor(props) {
    const { gateway, config } = props
    this.config = config
    this.gateway = gateway
    this.envMapper = new EnvMapper()

    const kvPrefix = config.keyvaluePrefix
    if (config.keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({ name: `${kvPrefix}-versions` })
      this.mappings = new KeyvalueDynamo({ name: `${kvPrefix}-mappings` })
    } else {
      this.versions = new KeyvalueLocal({ name: `${kvPrefix}-versions` })
      this.mappings = new KeyvalueLocal({ name: `${kvPrefix}-mappings` })
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
    const { gateway } = this

    const gatewayConfig = await this.getVersionConfig(versionId)
    logger.info({ prefix, version: gatewayConfig.version }, 'Updating Gateway')
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

  async addVersion(workerConfig) {
    const { config, versions } = this
    const {
      prefix,
      version,
      shapesContainer,
      shapesRegion,
      dbconfig,
    } = workerConfig

    // sanitizes the names
    const id = `${prefix.replace(/-/g, '_')}_${version
      .replace(/-/g, '_')
      .replace(/ /g, '_')}`
    const db = JSON.parse(JSON.stringify(config.db[dbconfig]))
    db.database = id

    const newConfig = {
      prefix,
      version,
      shapesContainer,
      shapesRegion,
      status: 'empty',
      db,
    }
    await versions.set(id, newConfig)
  }

  async getVersionConfig(versionId) {
    const { config, versions } = this

    // the gateway needs some settings from the orchestrator,
    // but also some settings from the worker config
    const workerConfig = await versions.get(versionId)
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
    logger.debug({ config: gatewayConfig }, 'Gateway Config')
    return gatewayConfig
  }

  async updateVersionStatus(versionId, status) {
    const { versions } = this
    const version = await versions.get(versionId)
    version.status = status
    await versions.set(versionId, version)
  }

  async allVersions() {
    // get all versions
    return this.versions.scan()
  }

  async allMappings() {
    // get all mappings
    return this.mappings.scan()
  }

  async getDockerCommand(versionId) {
    const config = await this.getVersionConfig(versionId)
    const env = this.envMapper.toEnvironmental(config, 'importer-local')
    const envArray = Object.keys(env).map(
      value => `${value}=${env[value].toString()}`
    )

    const command = `docker run -e "${envArray.join(
      '" -e "'
    )}" --network="container:waka-db" dymajo/waka-importer`
    return command
  }
}
module.exports = VersionManager
