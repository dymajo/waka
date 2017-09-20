const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const connection = require('./db/connection.js')
const gtfsImport = require('./db/gtfs-import.js')
const createShapes = require('./db/create-shapes.js')

const metlink = require('./agencies/metlink.js')
const at = require('./agencies/at.js')
const tfnsw = require('./agencies/tfnsw.js')

async function doShit() {
  const importer = new gtfsImport()
  // await importer.unzip('../cache/at.zip')
  await importer.unzip('../cache/metlink.zip')
  // await importer.unzip('../cache/sydney.zip')

  metlink.files.forEach((file) => {
    console.log(file)
    importer.upload('../cache/metlink.zipunarchived', file, metlink.prefix, '20170828_20170808-090059', []).then(() => {
      console.log('done')
    }).catch((err) => {
      console.log(err)
    })
  })

  const outputDir = '../cache/metlink.zipunarchived/shapes'
  // cleans up old import if exists
  if (fs.existsSync(outputDir)) {
    await new Promise((resolve, reject) => {
      rimraf(outputDir, resolve)
    })
  }
  fs.mkdirSync(outputDir)

  let metlinkShapes = new createShapes()
  await metlinkShapes.create('../cache/metlink.zipunarchived/shapes.txt', outputDir, ['20170828_20170808-090059'])
  await metlinkShapes.upload('nz-wlg-20170828-20170808-090059', path.resolve(outputDir, '20170828_20170808-090059'))
}
async function doOtherShit() {
  const outputDir = '../cache/at.zipunarchived/shapes'
  // cleans up old import if exists
  if (fs.existsSync(outputDir)) {
    await new Promise((resolve, reject) => {
      rimraf(outputDir, resolve)
    })
  }
  fs.mkdirSync(outputDir)

  let atShapes = new createShapes()
  await atShapes.create('../cache/at.zipunarchived/shapes.txt', outputDir, ['20170918162843_v58.15', '20170918164808_v58.16'])
  await atShapes.upload('nz-akl-20170918164808-v58-16', path.resolve(outputDir, '20170918164808_v58.16'))
  await atShapes.upload('nz-akl-20170918162843-v58-15', path.resolve(outputDir, '20170918162843_v58.15'))
}
// connection.isReady.then(doShit)
connection.isReady.then(doOtherShit)