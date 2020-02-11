import 'mocha'
import { createLogger } from 'bunyan'
import { expect } from 'chai'

import RedisDataAccess from '../../../src/waka-worker/dataAccess/redisDataAccess'

const logger = createLogger({ name: 'test-logger' })

describe('waka-worker/dataAccess/redisDataAccess', () => {
  it('should get lines for a stop', async () => {
    const redisDataAccess = new RedisDataAccess({ logger, prefix: 'fake', redis: null })
    redisDataAccess.getKey = async () => 'ABC/123,ABC/1234'

    const result = await redisDataAccess.getLinesForStop('1')
    expect(result).to.have.lengthOf(2)
    expect(result).to.deep.equal([
      {
        agency_id: 'ABC',
        route_short_name: '123'
      },
      {
        agency_id: 'ABC',
        route_short_name: '1234'
      }
    ])
  })

  it('should handle lines with route short names with slashes', async () => {
    const redisDataAccess = new RedisDataAccess({ logger, prefix: 'fake', redis: null })
    redisDataAccess.getKey = async () => 'ABC/12/3'

    const result = await redisDataAccess.getLinesForStop('1')
    expect(result).to.deep.equal([
      {
        agency_id: 'ABC',
        route_short_name: '12/3'
      }
    ])
  })

  it('should return an empty array if no transfers in cache', async () => {
    const redisDataAccess = new RedisDataAccess({ logger, prefix: 'fake', redis: null })
    redisDataAccess.getKey = async () => null

    const result = await redisDataAccess.getLinesForStop('1')
    expect(result).to.deep.equal([])
  })

  it('should return an empty array if there is an error getting transfers', async () => {
    const redisDataAccess = new RedisDataAccess({ logger, prefix: 'fake', redis: null })
    redisDataAccess.getKey = async () => { throw new Error('fake error') }

    const result = await redisDataAccess.getLinesForStop('1')
    expect(result).to.deep.equal([])
  })
})