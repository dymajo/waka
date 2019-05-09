import { ConnectionPool } from 'mssql'
import config from '../config'
import log from '../logger'
const connectMaster = async () => {
  const masterConfig = {
    ...config.db,
    database: config.db.master_database,
  }
  const { database } = config.db
  try {
    const pool = new ConnectionPool(masterConfig)
    await pool.connect()
    // prepared statements were not working.
    // also, you set this yourself, so your own fault if you drop all your tables
    await pool
      .request()
      .query(`If(db_id(N'${database}') IS NULL) CREATE DATABASE "${database}"`)
  } catch (err) {
    log('master', 'Failed to connect to master database! Check the db.database')
    log(err)
    process.exit(1)
  }
  return true
}

let cresolve: any
let creject: any
let pool1: ConnectionPool
const ready = new Promise((resolve, reject) => {
  cresolve = resolve
  creject = reject
})
const connection = {
  get: () => pool1,
  open: () => {
    connectMaster()
      .then(() => {
        pool1 = new ConnectionPool(config.db, err => {
          if (err) {
            log(err)
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
export default connection
