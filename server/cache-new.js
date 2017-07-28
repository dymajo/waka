const connection = require('./db/connection.js')
const gtfsImport = require('./db/gtfs-import.js')

const metlink = require('./agencies/metlink.js')
const at = require('./agencies/at.js')
const tfnsw = require('./agencies/tfnsw.js')

async function doShit() {
  const importer = new gtfsImport()
  await importer.unzip('../cache/at.zip')
  await importer.unzip('../cache/metlink.zip')
  // await importer.unzip('../cache/sydney.zip')

  metlink.files.forEach((file) => {
    console.log(file)
    importer.upload('../cache/metlink.zipunarchived', file, metlink.prefix, '1').then(() => {
      console.log('done')
    }).catch((err) => {
      console.log(err)
    })
  })
  at.files.forEach((file) => {
    console.log(file)
    importer.upload('../cache/at.zipunarchived', file, at.prefix, '1').then(() => {
      console.log('done')
    }).catch((err) => {
      console.log(err)
    })
  })
}
connection.isReady.then(doShit)