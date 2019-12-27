import 'dotenv'
import 'source-map-support/register'
// this only supports dynamo, because the local dev experience is different
import KeyvalueDynamo from '../waka-orchestrator/adaptors/keyvalueDynamo'
import WakaRealtime from './index'
import createLogger from './logger'



const prefix = process.env.PREFIX
const kvPrefix = process.env.KEYVALUE_PREFIX || 'waka'
const kvRegion = process.env.KEYVALUE_REGION || 'us-west-2'

const defaultConfig = {
  prefix,
  quota: {
    interval: 1000,
    rate: 5,
    concurrency: 5,
  },
  redis: {},
  api: { [prefix]: '' },
}

;(async () => {
  if (prefix === undefined) {
    throw new Error('Region Prefix (process.env.PREFIX) must be specified!')
  }
  const logger = createLogger(prefix)

  const meta = new KeyvalueDynamo({
    name: `${kvPrefix}-meta`,
    region: kvRegion,
  })
  const _remoteConfig = (await meta.get('config-realtime')) as unknown
  const remoteConfig = _remoteConfig[prefix]
  const mergedConfig = Object.assign(defaultConfig, remoteConfig)
  mergedConfig.prefix = prefix
  
  logger.info('Retrieved Configuration from Remote')
  const realtime = new WakaRealtime(mergedConfig, logger)
  await realtime.start()
})()
