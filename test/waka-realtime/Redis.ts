import 'mocha'
import { expect } from 'chai'
import { createLogger } from 'bunyan'
import Redis from 'ioredis'

import WakaRedis from '../../src/waka-realtime/Redis'

const testConfig = {
  prefix: 'fake-city',
  logger: createLogger({ name: 'test-logger' }),
  config: {},
}

class FakeRedisClient {
  connected = true
  store = new Map()
  set = async (
    key: string,
    value: string,
    expiryMode?: string,
    time?: string,
    setMode?: string
  ) => {
    this.store.set(key, {
      value,
      expiryMode,
      time,
      setMode,
    })
    return 'done'
  }
  get = async (key: string) => {
    return (this.store.get(key) || '').value || ''
  }
  disconnect = () => {
    this.connected = false
  }
}

describe('waka-realtime/Redis', () => {
  it('should create a new client on start', () => {
    const client = new WakaRedis(testConfig)
    client.start()
    expect(client.client).to.be.instanceOf(Redis)

    // cleanup
    client.client.disconnect()
  })

  it('should disconnect and remove the client on close', () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any

    client.stop()
    expect(client.client).to.be.null
  })

  it('should set a key with the correct format, value, and expiry', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any

    await client.setKey('test-id', 'information', 'trip-update')
    expect(
      fakeRedisClient.store.get('waka-rt:fake-city:trip-update:test-id').value
    ).to.equal('information')
  })

  it('should get a tripUpdate from the cache', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any
    fakeRedisClient.set(
      'waka-rt:fake-city:trip-update:test-id',
      '{"data": "information"}'
    )

    const update = await client.getTripUpdate('test-id')
    expect(update).to.deep.equal({ data: 'information' })
  })

  it('should get a vehiclePosition from the cache', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any
    fakeRedisClient.set(
      'waka-rt:fake-city:vehicle-position:test-id',
      '{"data": "information"}'
    )

    const update = await client.getVehiclePosition('test-id')
    expect(update).to.deep.equal({ data: 'information' })
  })

  it('should get an alert from the cache', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any
    fakeRedisClient.set(
      'waka-rt:fake-city:alert:test-id',
      '{"data": "information"}'
    )

    const update = await client.getAlert('test-id')
    expect(update).to.deep.equal({ data: 'information' })
  })

  it('should return an array for defined arrayKeys', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any
    fakeRedisClient.set('waka-rt:fake-city:alert-route:test-id', '1,2,3')

    const update = await client.getArrayKey('test-id', 'alert-route')
    expect(update).to.deep.equal(['1', '2', '3'])
  })

  it('should return an empty array for undefined arrayKeys', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any

    const update = await client.getArrayKey('test-id', 'alert-route')
    expect(update).to.deep.equal([])
  })

  it('should throw an error for unknown arrayKeys types', async () => {
    const client = new WakaRedis(testConfig)
    await client
      .getArrayKey('test-id', 'not-a-key' as any)
      .catch(err => expect(err).to.not.be.undefined)
  })

  it('should return a value for defined keys', async () => {
    const client = new WakaRedis(testConfig)

    // mock the client
    const fakeRedisClient = new FakeRedisClient()
    client.client = fakeRedisClient as any
    fakeRedisClient.set(
      'waka-rt:fake-city:last-trip-update:test-id',
      'information'
    )

    const update = await client.getKey('test-id', 'last-trip-update')
    expect(update).to.equal('information')
  })

  it('should throw an error for unknown key types', async () => {
    const client = new WakaRedis(testConfig)
    await client
      .getKey('test-id', 'not-a-key' as any)
      .catch(err => expect(err).to.not.be.undefined)
  })
})
