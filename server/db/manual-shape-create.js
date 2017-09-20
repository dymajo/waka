const createShapes = require('./create-shapes')

async function start() {
  let jono = new createShapes()
  await jono.create('shapes.txt', 'output')
  await jono.upload('shape-nz-akl-version', 'output')
}
start()