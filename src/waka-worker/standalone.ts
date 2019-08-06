import Express from 'express'
import 'dotenv'
import * as bodyParser from 'body-parser'
import 'source-map-support/register'
import EnvMapper from '../envMapper'
import WakaWorker from '.'

const { PREFIX, VERSION, PORT } = process.env
declare const process: {
  env: {
    PORT: string
    GATEWAY: string
    KEYVALUE: string
    KEYVALUE_PREFIX: string
    KEYVALUE_REGION: string
    STORAGE_SERVICE: 'aws' | 'local'
    PREFIX: string
    VERSION: string
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
  }
}
const envMapper = new EnvMapper()
const config = envMapper.fromEnvironmental(process.env)
const worker = new WakaWorker(config)

const app = Express()
app.use(bodyParser.json())
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', `waka-worker-${PREFIX}-${VERSION}`)
  next()
})
app.use(`/a/${PREFIX}`, worker.router)
app.use(worker.router)

const listener = app.listen(PORT, () => {
  worker.logger.info({ port: listener.address().port }, 'waka-worker listening')
  worker.start()
})
