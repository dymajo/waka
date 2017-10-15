const express = require('express')
const path = require('path')
const router = express.Router()
 
const Defaults = require('./defaults.js')
const defaults = new Defaults()

const sitemap = require('./sitemap.js')
const email = require('./email.js')
const Lines = require('./lines.js')
const lines = new Lines()

const Stations = require('./stations.js')
const stations = new Stations()

router.get('/', defaults.index)
router.get('/sitemap.txt', sitemap.get)
router.post('/a/email', email.sendEmail)

router.get('/s', stations.index)
router.get('/s/:region', stations.region)
router.get('/s/:region/:station', stations.times)
router.get('/s/:region/:station/timetable/:code', stations.index)
router.get('/s/:region/:station/realtime/:code', stations.index)
router.get('/s/:region/:station/*', (req, res) => defaults.notFound(res))

router.get('/l', lines.index)
router.get('/l/:region', lines.region)
router.get('/l/:region/:line', lines.line)
router.get('/l/:region/*', (req, res) => defaults.notFound(res))

router.use('/scss', express.static(path.resolve(__dirname + '/../scss')))
router.use('/', express.static(path.resolve(__dirname + '/../dist')))

router.get('/*', defaults.index)

module.exports = router
