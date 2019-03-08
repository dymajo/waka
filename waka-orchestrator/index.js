const { Router } = require('express')

const WakaProxy = require('../waka-proxy/index.js')
const GatewayLocal = require('./adaptors/gatewayLocal.js')
const GatewayEcs = require('./adaptors/gatewayEcs.js')
const GatewayKubernetes = require('./adaptors/gatewayKubernetes.js')

class WakaOrchestrator {
  constructor(config) {
    const { gateway, port } = config
    this.config = config

    this.router = new Router()
    if (gateway === 'local') {
      this.gateway = new GatewayLocal()
      this.proxy = new WakaProxy({ endpoint: `http://localhost:${port}` })
    } else if (gateway === 'ecs') {
      this.gateway = new GatewayEcs()
    } else if (gateway === 'kubernetes') {
      this.gateway = new GatewayKubernetes()
    }

    this.bindRoutes()
  }

  start() {
    const { gateway, proxy, config } = this
    gateway.start()

    if (config.gateway === 'local') {
      proxy.start()
    }
  }

  bindRoutes() {
    const { gateway, router, proxy, config } = this
    router.get('/ping', (req, res) => res.send('pong'))

    if (config.gateway === 'local') {
      router.use(gateway.router)
      router.use(proxy.router)
    }
  }
}
module.exports = WakaOrchestrator
