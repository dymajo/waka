const Express = require('express')
const WakaWorker = require('../waka-worker/index.js')
const WakaProxy = require('../waka-proxy/index.js')
const logger = require('./logger.js')

const app = new Express()
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'waka-orchestrator')
  next()
})
const port = process.env.PORT || 9001
const endpoint = process.env.ENDPOINT || `http://localhost:${port}`
const proxy = new WakaProxy({ endpoint })
const wellington = new WakaWorker({
  prefix: 'nz-wlg',
  version: 'School_Term_Blocks_20190211-125411',
  db: {
    user: 'SA',
    password: 'Str0ngPassword',
    server: 'localhost',
    database: 'nz-wlg_School_Term_Blocks_20190211-125411',
    transactionLimit: 50000,
    connectionTimeout: 60000,
    requestTimeout: 60000,
  },
  api: {},
})
const auckland = new WakaWorker({
  prefix: 'nz-akl',
  version: '20181217100848_v74_2',
  db: {
    user: 'SA',
    password: 'Str0ngPassword',
    server: 'localhost',
    database: 'nz_akl_20181217100848_v74_2',
    transactionLimit: 50000,
    connectionTimeout: 60000,
    requestTimeout: 60000,
  },
  api: {},
})
app.use('/nz-wlg', wellington.router)
app.use('/nz-akl', auckland.router)
app.use(proxy.router)

const listener = app.listen(port, () => {
  logger.info(
    { port: listener.address().port, endpoint },
    'waka-orchestrator listening'
  )
  wellington.start()
  auckland.start()
  proxy.start()
})
