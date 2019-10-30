/* eslint-disable promise/prefer-await-to-callbacks */
import AWS from 'aws-sdk'
import logger from '../logger'
import BaseKeyvalue from '../../types/BaseKeyvalue'

interface KeyvalueDynamoProps {
  name: string
  region: string
}

class KeyvalueDynamo extends BaseKeyvalue {
  name: string
  dynamo: AWS.DynamoDB
  constructor(props: KeyvalueDynamoProps) {
    super()
    const { name, region } = props
    this.name = name
    this.dynamo = new AWS.DynamoDB({ region })
  }

  flattenObject = (obj: AWS.DynamoDB.AttributeMap) => {
    const { flattenObject } = this
    const response: any = {}
    Object.keys(obj)
      .filter(key => key !== 'id')
      .forEach(key => {
        if (obj[key].M) {
          response[key] = flattenObject(obj[key].M)
        } else if (obj[key].L) {
          // little bit of a hack to use the flatten object for lists
          response[key] = obj[key].L.map(i => flattenObject({ i }).i)
        } else if (obj[key].BOOL !== undefined) {
          response[key] = obj[key].BOOL
        } else {
          response[key] = parseFloat(obj[key].N) || obj[key].S
        }
      })
    return response
  }

  fattenObject = (obj: any) => {
    const { fattenObject } = this
    const response: any = {}
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'boolean') {
        response[key] = { BOOL: obj[key] }
      } else if (typeof obj[key] === 'number') {
        response[key] = { N: obj[key].toString() }
      } else if (typeof obj[key] === 'string') {
        response[key] = { S: obj[key] }
      } else if (typeof obj[key] === 'object') {
        if (obj[key].constructor === Array) {
          // little bit of a hack to use the fatten object for lists
          response[key] = { L: obj[key].map(i => fattenObject({ i }).i) }
        } else {
          response[key] = { M: fattenObject(obj[key]) }
        }
      }
    })
    return response
  }

  get = async (key: string) => {
    const { name, dynamo, flattenObject } = this
    const params = {
      Key: {
        id: {
          S: key,
        },
      },
      TableName: name,
    }
    logger.debug(params)
    try {
      const result = await dynamo.getItem(params).promise()
      const response = result.Item || {}
      return flattenObject(response)
    } catch (err) {
      logger.warn({ err }, 'Could not get DynamoDB Item')
      return {}
    }
  }

  set = async (key: string, value: any) => {
    const { name, dynamo, fattenObject } = this
    const item = fattenObject(value)
    item.id = { S: key }
    const params = {
      Item: item,
      TableName: name,
    }
    logger.debug(params)
    return new Promise<boolean>(resolve => {
      dynamo.putItem(params, err => {
        if (err) {
          logger.warn({ err }, 'Could not set DynamoDB Item')
          return resolve(false)
        }
        return resolve(true)
      })
    })
  }

  delete = async (key: string) => {
    const { name, dynamo } = this
    const params = {
      Key: {
        id: {
          S: key,
        },
      },
      TableName: name,
    }
    logger.debug(params)
    return new Promise(resolve => {
      dynamo.deleteItem(params, err => {
        if (err) {
          logger.warn({ err }, 'Could not delete DynamoDB Item')
          return resolve(false)
        }
        return resolve(true)
      })
    })
  }

  scan = async () => {
    const { name, dynamo } = this
    const params = {
      TableName: name,
    }
    logger.debug(params)
    return new Promise(resolve => {
      dynamo.scan(params, (err, data) => {
        if (err) {
          logger.warn({ err }, 'Could not scan DynamoDB Table')
          return resolve({})
        }
        const response: { [key: string]: any } = {}
        data.Items.forEach(i => {
          response[i.id.S] = this.flattenObject(i)
        })
        return resolve(response)
      })
    })
  }
}
export default KeyvalueDynamo
