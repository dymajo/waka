const express = require('express')
const path = require('path')
const router = express.Router()
 
const Defaults = require('./defaults.js')
const defaults = new Defaults()

const email = require('./email.js')
const Lines = require('./lines.js')
const lines = new Lines()

const Stations = require('./stations.js')
const stations = new Stations()

router.get('/', defaults.index)
router.post('/email', email.sendEmail)

router.get('/s', stations.index)
router.get('/s/:region', stations.region)

router.get('/l', lines.index)
router.get('/l/:region', lines.region)

router.use('/scss', express.static(path.resolve(__dirname + '/../scss')))
router.use('/', express.static(path.resolve(__dirname + '/../dist')))

router.get('/*', defaults.index)

module.exports = router
