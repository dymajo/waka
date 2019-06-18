import FormData from 'form-data'
import { createReadStream } from 'fs'
import logger from '../logger'
import axios from 'axios'
import { PutObjectRequest } from 'aws-sdk/clients/s3'
import AWS from 'aws-sdk'
import { ServerResponse } from 'http'
import * as Logger from 'bunyan'

// import { PutObjectRequest } from 'aws-sdk/clients/s3'

interface StorageProps {
  backing?: 'aws' | 'local'
  endpoint?: string
  region?: string
  logger: Logger
}

class Storage {
  backing: string
  s3: AWS.S3
  logger: Logger
  constructor(props: StorageProps) {
    this.logger = props.logger
    this.backing = props.backing
    if (this.backing === 'aws') {
      // const credentials = new AWS.SharedIniFileCredentials({
      //   profile: 'dymajo',
      // })
      // AWS.config.credentials = credentials
      this.s3 = new AWS.S3({
        endpoint: props.endpoint,
        region: props.region,
      })
    }
  }

  createContainer(container: string, cb: any) {
    const createCb = (error: any) => {
      if (error) {
        this.logger.info(error)
        throw error
      }
      cb()
    }
    if (this.backing === 'aws') {
      const params = {
        Bucket: container,
      }
      this.s3.createBucket(params, createCb)
    }
  }

  async downloadStream(
    container: string,
    file: string,
    stream: ServerResponse,
    callback: (error: any, data?: any) => void
  ) {
    if (this.backing === 'aws') {
      const params = {
        Bucket: container,
        Key: file,
      }
      return this.s3
        .getObject(params)
        .createReadStream()
        .on('error', err => {
          // if (err.code !== 'NoSuchKey') {
          this.logger.error(err)
          // }
          callback(err)
        })
        .on('end', (data: any) => callback(null, data)) // do nothing, but this prevents from crashing
        .pipe(stream)
    }
    if (this.backing === 'local') {
      const res = await axios.get(`http://127.0.0.1:9004/${file}`, {
        responseType: 'stream',
      })
      res.data.on('error', err => {
        this.logger.error(err)
        callback(err)
      })
      res.data.on('end', data => callback(null, data))
      res.data.pipe(stream)
    }
  }

  async uploadFile(container: string, file: string, sourcePath: string) {
    if (this.backing === 'aws') {
      const params: PutObjectRequest = {
        Body: createReadStream(sourcePath),
        Bucket: container,
        Key: file,
      }
      return this.s3.putObject(params).promise()
    }
    if (this.backing === 'local') {
      try {
        const bodyFormData = new FormData()
        bodyFormData.append('uploadFile', createReadStream(sourcePath))
        return axios.post(`http://127.0.0.1:9004/${file}`, bodyFormData, {
          headers: bodyFormData.getHeaders(),
        })
      } catch (error) {
        this.logger.error(error.data)
        // throw error
      }
    }
    throw Error('not supported backing')
  }
}
export default Storage
