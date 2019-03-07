const Express = require('express')
const WakaProxy = require('./waka-proxy')

const app = new Express()
const proxy = new WakaProxy({ endpoint: 'https://waka.app/a' })
app.use(proxy.router)

const listener = app.listen(9001, () => {
  console.log(
    'Standalone waka-proxy listening on port',
    listener.address().port
  )
  proxy.start()
})
