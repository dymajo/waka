import 'mocha'
import { join } from 'path'
import mockFs from 'mock-fs'
import fs from 'fs'
import { expect } from 'chai'
import KeyvalueLocal from '../../../src/waka-orchestrator/adaptors/keyvalueLocal'

const cachePath = join(__dirname, '../../../src/cache')
const dummyData = { some: 'data' }
const dummyFs = {
  [cachePath]: {
    'keyvalue-read_test.json': JSON.stringify(dummyData),
    'keyvalue-key_test.json': JSON.stringify({ testKey: 'testKey_value' }),
    'keyvalue-delete_test.json': JSON.stringify({ testKey: 'deleteme' }),
  },
}

describe('waka-orchestrator/adaptors/keyvalueLocal', () => {
  beforeEach(() => {
    mockFs(dummyFs)
  })
  afterEach(() => {
    mockFs.restore()
  })

  it('should write a file with data', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'write_test' })
    await keyvalueLocal.write(dummyData)
    const data = await fs.readFileSync(
      join(cachePath, 'keyvalue-write_test.json')
    )
    expect(JSON.parse(data.toString())).to.deep.equal(dummyData)
  })

  it('should read a value', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'read_test' })
    const data = await keyvalueLocal.read()
    expect(data).to.deep.equal(dummyData)
  })

  it('should return an empty object if the dataset does not exist', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'read_fail_test' })
    const data = await keyvalueLocal.read()
    expect(data).to.deep.equal({})
  })

  it('should get a keys data', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'key_test' })
    const value = await keyvalueLocal.get('testKey')
    expect(value).to.equal('testKey_value')
  })

  it('should return an empty object if there is no data in a key', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'key_test' })
    const value = await keyvalueLocal.get('nonExistKey')
    expect(value).to.deep.equal({})
  })

  it('should persist data in a key', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'set_test' })
    const stringValue = 'string'
    const numberValue = 69
    const objectValue = { a: 'object' }
    await keyvalueLocal.set('string', stringValue)
    await keyvalueLocal.set('number', numberValue)
    await keyvalueLocal.set('object', objectValue)
    expect(await keyvalueLocal.get('string')).to.deep.equal(stringValue)
    expect(await keyvalueLocal.get('number')).to.deep.equal(numberValue)
    expect(await keyvalueLocal.get('object')).to.deep.equal(objectValue)
  })

  it('should delete data in a key', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'delete_test' })
    expect(await keyvalueLocal.get('testKey')).to.equal('deleteme')
    await keyvalueLocal.delete('testKey')
    expect(await keyvalueLocal.get('testKey')).to.deep.equal({})
  })

  it('should return all data in a scan', async () => {
    const keyvalueLocal = new KeyvalueLocal({ name: 'read_test' })
    const data = await keyvalueLocal.scan()
    expect(data).to.deep.equal(dummyData)
  })
})
