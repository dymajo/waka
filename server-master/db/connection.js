const sql = require('mssql')
const config = require('./config-master.js')
 
let pool1
const ready = new Promise((resolve, reject) => {
  pool1 = new sql.ConnectionPool(config, err => {
    if (err) {
      console.error(err)
      return reject()
    }
    resolve()
  })
})
const connection = {
  get: () => {
    return pool1
  },
  isReady: ready
}
module.exports = connection