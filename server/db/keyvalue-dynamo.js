/* eslint-disable promise/prefer-await-to-callbacks */

const AWS = require('aws-sdk')
const logger = require('../logger.js')

class KeyvalueDynamo {
  constructor(props) {
    const { name, region } = props
    this.name = name
    this.dynamo = new AWS.DynamoDB({ region })

    this.flattenObject = this.flattenObject.bind(this)
    this.fattenObject = this.fattenObject.bind(this)
  }

  flattenObject(obj) {
    const { flattenObject } = this
    const response = {}
    Object.keys(obj)
      .filter(key => key !== 'id')
      .forEach(key => {
        if (obj[key].M) {
          response[key] = flattenObject(obj[key].M)
        } else {
          response[key] = parseFloat(obj[key].N) || obj[key].S
        }
      })
    return response
  }

  fattenObject(obj) {
    const { fattenObject } = this
    const response = {}
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'number') {
        response[key] = { N: obj[key].toString() }
      } else if (typeof obj[key] === 'string') {
        response[key] = { S: obj[key] }
      } else if (typeof obj[key] === 'object') {
        response[key] = { M: fattenObject(obj[key]) }
      }
    })
    return response
  }

  async get(key) {
    const { name, dynamo, flattenObject } = this
    const params = {
      Key: {
        id: {
          S: key,
        },
      },
      TableName: name,
    }
    return new Promise(resolve => {
      dynamo.getItem(params, (err, data) => {
        if (err) {
          logger({ err }, 'Could not get DynamoDB Item')
          return resolve({})
        }
        const response = data.Item || {}
        return resolve(flattenObject(response))
      })
    })
  }

  async set(key, value) {
    const { name, dynamo, fattenObject } = this
    const item = fattenObject(value)
    item.id = { S: key }
    const params = {
      Item: item,
      TableName: name,
    }
    return new Promise(resolve => {
      dynamo.putItem(params, err => {
        if (err) {
          logger({ err }, 'Could not set DynamoDB Item')
          return resolve(false)
        }
        return resolve(true)
      })
    })
  }

  async delete(key) {
    const { name, dynamo } = this
    const params = {
      Key: {
        id: {
          S: key,
        },
      },
      TableName: name,
    }
    return new Promise(resolve => {
      dynamo.deleteItem(params, err => {
        if (err) {
          logger({ err }, 'Could not delete DynamoDB Item')
          return resolve(false)
        }
        return resolve(true)
      })
    })
  }

  async scan() {
    const { name, dynamo } = this
    const params = {
      TableName: name,
    }
    return new Promise(resolve => {
      dynamo.scan(params, (err, data) => {
        if (err) {
          logger({ err }, 'Could not scan DynamoDB Table')
          return resolve({})
        }
        const response = {}
        data.Items.forEach(i => {
          response[i.id.S] = this.flattenObject(i)
        })
        return resolve(response)
      })
    })
  }
}
module.exports = KeyvalueDynamo
