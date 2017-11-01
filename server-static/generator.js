// does a one time generation of index.html
const fs = require('fs')
const path = require('path')
const pug = require('pug')
const template = pug.compileFile(path.resolve(__dirname, './templates/layout.pug'))
const manifest = require('../dist/assets.json')

const fn = function () {
  fs.writeFileSync(path.resolve(__dirname, '../dist/' + 'index-generated.html'), template({
    title: 'Transit',
    description: 'localhost mode',
    vendorpath: '/generated/vendor.bundle.js',
    apppath: '/generated/app.bundle.js',
    analyticspath: '/generated/analytics.bundle.js',
    csspath: '/generated/app.css'
  }))
  console.log('Written /dist/index-generated.html')
}
module.exports = fn