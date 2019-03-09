const path = require('path')
const fs = require('fs').promises
const logger = require('../logger.js')

// this is designed to be slow af to emulate the dynamoDB lag
const filePath = path.join(__dirname, '../../cache/keyvalue-')
class KeyvalueLocal {
  constructor(props) {
    const { name } = props
    this.name = name
  }

  async read() {
    const { name } = this
    try {
      const content = await fs.readFile(`${filePath}${name}.json`)
      const data = JSON.parse(content)
      return data
    } catch (err) {
      return {}
    }
  }

  async write(data) {
    const { name } = this
    await fs.writeFile(`${filePath}${name}.json`, JSON.stringify(data))
  }

  async get(key) {
    const data = await this.read()
    const value = data[key]
    return value || {}
  }

  async set(key, value) {
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

  async delete(key) {
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
module.exports = KeyvalueLocal
