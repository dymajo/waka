import * as Logger from 'bunyan'
import { ConnectionPool } from 'mssql'
import { DBConfig } from '../../typings'

class Connection {
  db: DBConfig
  logger: Logger
  pool: ConnectionPool
  ready: Promise<{}>
  readyResolve: (value?: {} | PromiseLike<{}>) => void
  readyReject: (reason?: any) => void
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
    this.pool = new ConnectionPool(this.db, err => {
      if (err) {
        this.logger.error(err)
        this.logger.info('Retrying connection in 30s.')
        setTimeout(() => {
          this.logger.info('Trying to open DB connection.')
          this.open()
        }, 30000)
        // never reject, just retry
      }
      this.readyResolve()
      return this.ready
    })
    return this.ready
  }
}
export default Connection
