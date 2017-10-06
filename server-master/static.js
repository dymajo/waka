const path = require('path')
const child_process = require('child_process')
const httpProxy = require('http-proxy')

const staticServer = path.join(__dirname, '../server-static/index.js')

const proxy = httpProxy.createProxyServer()

class Static {
  constructor() {
    this.port = 80
    this.start = this.start.bind(this)
    this.route = this.route.bind(this)
  }
  start() {
    return new Promise((resolve, reject) => {
      this.process = child_process.fork(staticServer).on('message', (message) => {
        if (message.type === 'portbroadcast') {
          this.port = message.data
        } else if (message.type === 'ready') {
          resolve(this.port)
        }
      })
    })
  }
  route(req, res) {
    proxy.web(req, res, { target: 'http://127.0.0.1:' + this.port})
  }
}
module.exports = Static