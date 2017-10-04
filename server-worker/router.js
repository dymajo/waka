const log = require('../server-common/logger.js')
const router = require('express').Router()
const request = require('request')
const importers = require('./importers/index.js')

const signature = function() {
  return {
    prefix: global.config.prefix,
    version: global.config.version,
  }
}

router.get('/a/info', function(req, res) {
  res.send(signature())
})
router.get('/internal/import', function(req, res) {
  log('Started Import')
  res.send()

  const importer = new importers()
  importer.start().then(() => {
    request({
      method: 'POST',
      uri: 'http://127.0.0.1:8001/import-complete',
      json: true,
      body: signature()
    })
  })
})

module.exports = router