import logger from './logger'
import KeyvalueLocal from './adaptors/keyvalueLocal'
import KeyvalueDynamo from './adaptors/keyvalueDynamo'
import { WakaConfig } from '../typings'
import BaseKeyvalue from '../types/BaseKeyvalue'

class ConfigManager {
  config: WakaConfig
  meta: BaseKeyvalue

  constructor() {
    const config: WakaConfig = {
      port: Number.parseInt(process.env.PORT, 10) || 9001,
      gateway: process.env.GATEWAY || 'local',
      keyvalue: process.env.KEYVALUE || 'local',
      keyvaluePrefix: process.env.KEYVALUE_PREFIX || 'waka',
      keyvalueRegion: process.env.KEYVALUE_REGION || 'us-west-2',
      storageService: process.env.STORAGE_SERVICE || 'aws',
      transactionLimit: 50000,
      connectionTimeout: 60000,
      requestTimeout: 60000,

      api: {
        'nz-akl': undefined, // dev-portal.at.govt.nz
        'agenda-21': undefined, // ask @DowntownCarpark on Twitter
        'au-syd': undefined, // opendata.transport.nsw.gov.au
        'us-sfo': undefined,
      },
      db: {
        local: {
          server: 'localhost',
          user: 'SA',
          password: 'Str0ngPassword',
          database: null,
        },
      },
      updaters: {},
      importer: {},
      redis: {
        port: 6379,
        host: 'localhost',
        family: 4,
        db: 0,
      },
      gatewayConfig: {
        // local doesn't need config
        ecs: null,
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
    const _remoteConfig = (await this.meta.get('config')) as unknown
    const remoteConfig = _remoteConfig as {
      api: { 'agenda-21': string; 'au-syd': string; 'nz-akl': string }
      db: {
        connectionTimeoutNumber: number
        requestTimeoutNumber: number
        transactionLimitNumber: number
        uat: {
          passwordString: string
          serverString: string
          userString: string
        }
      }
    }
    const mergedConfig = Object.assign(localConfig, remoteConfig)
    logger.info('Configuration retrieved from remote.')
    return mergedConfig
  }
}
export default ConfigManager
