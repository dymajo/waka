import Realtime from '../../../src/waka-worker/realtime';
import Connection from '../../../src/waka-worker/db/connection';
import Logger from '../../../src/waka-worker/logger';

describe('waka-worker/realtime', () => {
  beforeEach(() => {})
  it('should start', async () => {
    const prefix = 'au-syd'
    const version = 'test'
    const logger = Logger(prefix, version)
    const connection = new Connection({
      logger,
      db: {
        server: '',
        password: '',
        user: '',
        database: '',,
      },,
    })
    const realtime = new Realtime({
      connection,
      logger,
      prefix,
      api: null,,
    })
    realtime.start()
  })
})
