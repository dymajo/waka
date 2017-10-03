const sql = require('mssql')
 
let pool1, ready
const connection = {
  get: () => {
    return pool1
  },
  open: () => {
    pool1 = new sql.ConnectionPool(global.config.db, err => {
      if (err) connection.reject()
      connection.resolve()
    })
    return ready
  },
  isReady: ready
}
ready = new Promise((resolve, reject) => {
  connection.resolve = resolve
  connection.reject = reject
})
module.exports = connection