const express = require('express')
const path = require('path')
const httpProxy = require('http-proxy')
const Defaults = require('./defaults.js')
const sitemap = require('./sitemap.js')
const email = require('./email.js')

const router = express.Router()
const defaults = new Defaults()
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  target: {
    https: true,
  },
})

router.get('/', defaults.index)
router.get('/sitemap.txt', sitemap.get)
router.post('/a/email', email.sendEmail)

router.get('/s', defaults.index)
router.get('/s/:region', defaults.index)
router.get('/s/:region/:station', defaults.index)
router.get('/s/:region/:station/timetable/:code', defaults.index)
router.get('/s/:region/:station/realtime/:code', defaults.index)
router.get('/s/:region/:station/*', (req, res) => defaults.notFound(res))

router.get('/l', defaults.index)
router.get('/l/:region', defaults.index)
router.get('/l/:region/:line', defaults.index)
router.get('/l/:region/*', (req, res) => defaults.notFound(res))

// because we have a thing that removes trailing slashes...
router.get('/docs', (req, res) => {
  res.send(
    'docs are located at <a href="/docs/index.html">/docs/index.html</a>'
  )
})
router.use('/scss', express.static(path.resolve(__dirname + '/../scss')))
router.use('/', express.static(path.resolve(__dirname + '/../dist')))

const proxyHandle = (req, res) => {
  proxy.web(req, res, { target: 'https://waka.app/' })
}

router.all('/a', proxyHandle)
router.all('/a/*', proxyHandle)
router.get('/*', defaults.index)

module.exports = router
