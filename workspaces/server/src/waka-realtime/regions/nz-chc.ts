import axios from 'axios'
import { Logger } from '../../types'
import Redis from '../Redis'
import SingleEndpoint from '../SingleEndpoint'

interface ChristchurchRealtimeProps {
  wakaRedis: Redis
  logger: Logger
  scheduleUpdatePullTimeout?: number
  scheduleLocationPullTimeout?: number
}

class ChristchurchRealtime extends SingleEndpoint {
  constructor(props: ChristchurchRealtimeProps) {
    super({
      axios: axios.create({
        baseURL:
          'http://rtt.metroinfo.org.nz/rtt/public/utility/gtfsrealtime.aspx/',
        headers: {
          Accept: 'application/x-protobuf',
        },
        responseType: 'arraybuffer',
        timeout: 5000,
      }),
      vehiclePositionEndpoint: 'vehicleposition',
      tripUpdateEndpoint: 'tripupdate',
      serviceAlertEndpoint: 'alert',
      apiKeyRequired: false,
      scheduleAlertPullTimeout: 60000,
      ...props,
    })
  }
}

export default ChristchurchRealtime
