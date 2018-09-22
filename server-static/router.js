const express = require('express')
const path = require('path')
const router = express.Router()

const Defaults = require('./defaults.js')
const defaults = new Defaults()

const sitemap = require('./sitemap.js')
const email = require('./email.js')

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
router.get('/a/*', (req, res) => {
  res.status(502).send({
    error: 'server-static is online, but the API is not.',
  })
})

router.get('/*', defaults.index)

module.exports = router
