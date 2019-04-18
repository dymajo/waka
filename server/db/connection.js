const sql = require('mssql')
const colors = require('colors')
const config = require('../config')

const connectMaster = async () => {
  const { database } = config.db
  const masterConfig = JSON.parse(JSON.stringify(config.db))
  masterConfig.database = masterConfig.master_database
  try {
    const pool = await sql.connect(masterConfig)
    // prepared statements were not working.
    // also, you set this yourself, so your own fault if you drop all your tables
    await pool
      .request()
      .query(`If(db_id(N'${database}') IS NULL) CREATE DATABASE "${database}"`)
  } catch (err) {
    console.error(
      'master'.red,
      'Failed to connect to master database! Check the db.database'.red
    )
    console.error(err)
    process.exit(1)
  }
  return true
}

let cresolve
let creject
let pool1
const ready = new Promise((resolve, reject) => {
  cresolve = resolve
  creject = reject
})
const connection = {
  get: () => pool1,
  open: () => {
    connectMaster()
      .then(() => {
        pool1 = new sql.ConnectionPool(config.db, err => {
          if (err) {
            console.error(err)
            return creject()
          }
          return cresolve()
        })
        return pool1
      })
      .catch(err => {
        throw err
      })
    return ready
  },
  isReady: ready,
}
module.exports = connection
