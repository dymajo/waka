import * as path from 'path'
import fs from 'fs'
import logger from '../logger'
import { BaseKeyvalue } from '../../typings'

// this is designed to be slow af to emulate the dynamoDB lag
const filePath = path.join(__dirname, '../../cache/keyvalue-')
class KeyvalueLocal extends BaseKeyvalue {
  constructor(props) {
    super()
    const { name } = props
    this.name = name
  }

  async read() {
    const { name } = this
    try {
      const content = fs.readFileSync(`${filePath}${name}.json`)
      const jsonstring = content.toString()
      const data = JSON.parse(jsonstring)
      return data
    } catch (err) {
      return {}
    }
  }

  async write(data) {
    const { name } = this
    fs.writeFileSync(`${filePath}${name}.json`, JSON.stringify(data, null, 2))
  }

  async get(key: string) {
    const data = await this.read()
    const value = data[key]
    return value || {}
  }

  async set(key: string, value: any) {
    const data = await this.read()
    data[key] = value
    try {
      await this.write(data)
      return true
    } catch (err) {
      logger.error({ err }, 'Could not write data.')
      return false
    }
  }

  async delete(key: string) {
    const data = await this.read()
    delete data[key]
    try {
      await this.write(data)
      return true
    } catch (err) {
      logger.error({ err }, 'Could not write data.')
      return false
    }
  }

  async scan() {
    const data = await this.read()
    return data
  }
}
export default KeyvalueLocal
