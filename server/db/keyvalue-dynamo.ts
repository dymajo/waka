/* eslint-disable promise/prefer-await-to-callbacks */

import { DynamoDB } from 'aws-sdk'
import logger from '../logger'

interface IKeyvalueDynamo {
  name: string
  region: string
}

class KeyvalueDynamo {
  name: string
  dynamo: DynamoDB
  constructor(props: IKeyvalueDynamo) {
    const { name, region } = props
    this.name = name
    this.dynamo = new DynamoDB({ region })

    this.flattenObject = this.flattenObject.bind(this)
    this.fattenObject = this.fattenObject.bind(this)
  }

  flattenObject(obj: any) {
    const { flattenObject } = this
    const response: any = {}
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

  fattenObject(obj: { [key: string]: any }) {
    const { fattenObject } = this
    // type Response = {
    //   [key: string]: Response | DynamoDB.AttributeValue | DynamoDB.AttributeMap
    // }
    // const response: Response = {}
    const response: any = {}

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

  async get(key: string) {
    const { name, dynamo, flattenObject } = this
    const params = {
      Key: {
        id: {
          S: key,
        },
      },
      TableName: name,
    }
    try {
      const data = await dynamo.getItem(params).promise()
      const response = data.Item || {}
      return flattenObject(response)
    } catch (err) {
      logger({ err }, 'Could not get DynamoDB Item')
      return {}
    }
  }

  async set(key: string, value: any) {
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

  async delete(key: string) {
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
        const response: any = {}
        data.Items.forEach(i => {
          response[i.id.S] = this.flattenObject(i)
        })
        return resolve(response)
      })
    })
  }
}
export default KeyvalueDynamo
