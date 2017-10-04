const fs = require('fs')
const path = require('path')
const log = require('../../server-common/logger.js')
const connection = require('./connection.js')

async function create() {
  log('Creating Tables...')
  await connection.get().request().batch(fs.readFileSync(path.resolve(__dirname, './procs/tables.sql')).toString())

  log('Database Created')
}

class CreateDB {
  start() {
    return create()
  }
}
module.exports = CreateDB