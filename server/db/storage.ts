import AWS from 'aws-sdk'
import { PutObjectRequest } from 'aws-sdk/clients/s3'
import axios from 'axios'
import FormData from 'form-data'
import { createReadStream } from 'fs'
import { ServerResponse } from 'http'
import config from '../config'
import logger from '../logger'

const log = logger(config.prefix, config.version)
interface StorageProps {
  backing?: string
  endpoint?: string
  region?: string
}

class Storage {
  backing?: string
  s3?: AWS.S3
  constructor(props: StorageProps) {
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

  createContainer(container: string, cb: () => void) {
    const createCb = (error: unknown) => {
      if (error) {
        log.error(error)
        throw error
      }
      cb()
    }
    if (this.backing === 'aws' && this.s3) {
      const params = {
        Bucket: container,
      }
      this.s3.createBucket(params, createCb)
    }
  }

  downloadStream = async (
    container: string,
    file: string,
    stream: ServerResponse,
    callback: (error: unknown, data?: unknown) => void,
  ) => {
    if (this.backing === 'aws' && this.s3) {
      const params = {
        Bucket: container,
        Key: file,
      }
      return this.s3
        .getObject(params)
        .createReadStream()
        .on('error', (err) => {
          // if (err.code !== 'NoSuchKey') {
          log.error(err)
          // }
          callback(err)
        })
        .on('end', (data: unknown) => callback(null, data)) // do nothing, but this prevents from crashing
        .pipe(stream)
    }
    return null
  }

  uploadFile = async (container: string, file: string, sourcePath: string) => {
    if (this.backing === 'aws' && this.s3) {
      const params: PutObjectRequest = {
        Body: createReadStream(sourcePath),
        Bucket: container,
        Key: file,
      }
      await this.s3.putObject(params).promise()
    }
    if (this.backing === 'local') {
      try {
        const bodyFormData = new FormData()
        bodyFormData.append('uploadFile', createReadStream(sourcePath))
        await axios.post(`http://127.0.0.1:9004/${file}`, bodyFormData, {
          headers: bodyFormData.getHeaders(),
        })
      } catch (error) {
        log.error(error.data)
        // throw error
      }
    }
  }
}
export default Storage
