const logger = require('./logger.js')
const KeyvalueLocal = require('./adaptors/keyvalueLocal.js')
const KeyvalueDynamo = require('./adaptors/keyvalueDynamo.js')

class ConfigManager {
  constructor() {
    const config = {
      port: process.env.PORT || 9001,
      gateway: process.env.GATEWAY || 'local',
      keyvalue: process.env.KEYVALUE || 'local',
      keyvaluePrefix: process.env.KEYVALUE_PREFIX || 'waka',
      keyvalueRegion: process.env.KEYVALUE_REGION || 'us-west-2',
      storageService: 'aws',
      emulatedStorage: false,
      transactionLimit: 50000,
      connectionTimeout: 60000,
      requestTimeout: 60000,

      api: {
        'nz-akl': null, // dev-portal.at.govt.nz
        'agenda-21': null, // ask @DowntownCarpark on Twitter
        'au-syd': null, // opendata.transport.nsw.gov.au
      },
      db: {
        local: {
          server: 'localhost',
          user: 'SA',
          password: 'Str0ngPassword',
        },
      },
      updaters: {
        'nz-akl': false,
        'nz-wlg': false,
        'au-syd': false,
      },
      importer: {},
      gatewayConfig: {
        // local doesn't need config
        ecs: {},
        kubernetes: {},
      },
    }
    this.config = config

    const kvPrefix = config.keyvaluePrefix
    if (config.keyvalue === 'dynamo') {
      this.meta = new KeyvalueDynamo({
        name: `${kvPrefix}-meta`,
        region: config.keyvalueRegion,
      })
    } else {
      this.meta = new KeyvalueLocal({
        name: `${kvPrefix}-meta`,
      })
    }
  }

  async getConfig() {
    const localConfig = this.config
    const remoteConfig = await this.meta.get('config')
    const mergedConfig = Object.assign(localConfig, remoteConfig)
    logger.info('Configuration retrieved from remote.')
    return mergedConfig
  }
}
module.exports = ConfigManager
