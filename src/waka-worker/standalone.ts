import Express from 'express'
import 'dotenv'
import * as bodyParser from 'body-parser'
import 'source-map-support/register'
import EnvMapper from '../envMapper'
import WakaWorker from '.'
const { PREFIX, VERSION, PORT } = process.env

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
  worker.logger.info(
    { port: listener.address()['port'] },
    'waka-worker listening'
  )
  worker.start()
})
