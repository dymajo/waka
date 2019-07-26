import 'dotenv'

import WakaRealtime from './index'
import EnvMapper from '../envMapper'

// console.log(process.env)
// const envMapper = new EnvMapper()
// const config = envMapper.fromEnvironmental(process.env)
const config = {
    prefix: 'nz-akl',
    version: '20190710',
    quota: {
      interval: 1000,
      rate: 5,
      concurrency: 5,
    },
    api: { 'nz-akl': '' },
  }
  // const config = {
  //   prefix: 'au-syd',
  //   version: '20190710',
  //   quota: {
  //     interval: 1000,
  //     rate: 5,
  //     concurrency: 5,
  //   },
  //   api: { 'au-syd': '' },
  // }
;(async () => {
  const realtime = new WakaRealtime(config)
  await realtime.start()
})()
