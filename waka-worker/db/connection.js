const sql = require('mssql')

class Connection {
  constructor(props) {
    const { logger, db } = props
    this.db = db
    this.logger = logger

    this.pool = null
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })
  }

  get() {
    return this.pool
  }

  open() {
    this.pool = new sql.ConnectionPool(this.db, err => {
      if (err) {
        this.logger.error(err)
        return this.readyReject()
      }
      this.readyResolve()
      return this.ready
    })
    return this.ready
  }
}
module.exports = Connection
