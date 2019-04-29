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
    const region = config.keyvalueRegion
    if (config.keyvalue === 'dynamo') {
      this.versions = new KeyvalueDynamo({
        name: `${kvPrefix}-versions`,
        region,
      })
      this.mappings = new KeyvalueDynamo({
        name: `${kvPrefix}-mappings`,
        region,
      })
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
      this.updateGateway(prefix, mappingsTable[prefix].value)
    )
  }

  async stop() {
    // This is never called, and it probably never should be.
    const mappingsTable = await this.mappings.scan()
    const mappings = Object.keys(mappingsTable)
    mappings.forEach(prefix => this.stopGateway(prefix))
  }

  async updateGateway(prefix, versionId) {
    const { gateway } = this

    const gatewayConfig = await this.getVersionConfig(versionId)
    logger.info({ prefix, version: gatewayConfig.version }, 'Updating Gateway')

    // We trust the gateways to handle the scheduling of new tasks / configs
    // We shouldn't have to stop the gateway or anything silly.
    gateway.start(prefix, gatewayConfig)
  }

  async recycleGateway(prefix) {
    const { gateway } = this
    logger.info({ prefix }, 'Recycling Gateway')
    const versionId = (await this.mappings.get(prefix)).value
    const gatewayConfig = await this.getVersionConfig(versionId)
    gateway.recycle(prefix, gatewayConfig)
  }

  stopGateway(prefix) {
    const { gateway } = this
    logger.info({ prefix }, 'Stopping Gateway')
    gateway.stop(prefix)
  }

  async updateMapping(prefix, versionId) {
    await this.mappings.set(prefix, { value: versionId })
    await this.updateGateway(prefix, versionId)
  }

  async deleteMapping(prefix) {
    this.stopGateway(prefix)
    logger.info({ prefix }, 'Deleting Gateway')
    await this.mappings.delete(prefix)
  }

  async checkVersionExists(prefix, version) {
    const { versions } = this
    const id = `${prefix.replace(/-/g, '_')}_${version
      .replace(/-/g, '_')
      .replace(/ /g, '_')}`
    const data = await versions.get(id)

    return {
      id,
      exists: Object.keys(data).length > 0,
    }
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
    return id
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
      status: workerConfig.status,
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
      // importer only, should be ignored
      keyvalue: config.keyvalue,
      keyvaluePrefix: config.keyvaluePrefix,
      keyvalueRegion: config.keyvalueRegion,
    }
    logger.debug({ config: gatewayConfig }, 'Gateway Config')
    return gatewayConfig
  }

  async updateVersionStatus(versionId, status) {
    // statuses:
    // empty -> pendingimport -> importing -> imported
    // empty -> pendingimport-willmap -> importing-willmap -> imported-willmap -> imported
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
      value => `${value}=${(env[value] || '').toString()}`
    )

    const command = `docker run -e "${envArray.join(
      '" -e "'
    )}" --network="container:waka-db" dymajo/waka-importer`
    return command
  }

  async getFargateVariables(versionId) {
    const config = await this.getVersionConfig(versionId)
    const env = this.envMapper.toEnvironmental(config, 'importer')
    const envArray = Object.keys(env).map(name => ({
      name,
      value: (env[name] || '').toString(),
    }))
    return envArray
  }
}
module.exports = VersionManager
