import axios from 'axios'
import { Logger } from '../../types'
import Redis from '../Redis'
import SingleEndpoint from '../SingleEndpoint'

interface AucklandRealtimeProps {
  wakaRedis: Redis
  apiKey: string
  logger: Logger
  scheduleUpdatePullTimeout?: number
  scheduleLocationPullTimeout?: number
}

class AucklandRealtime extends SingleEndpoint {
  constructor(props: AucklandRealtimeProps) {
    super({
      axios: axios.create({
        baseURL: 'https://api.at.govt.nz/v2/public/realtime/',
        headers: {
          'Ocp-Apim-Subscription-Key': props.apiKey,
          Accept: 'application/x-protobuf',
        },
        responseType: 'arraybuffer',
        timeout: 5000,
      }),
      vehiclePositionEndpoint: 'vehiclelocations',
      tripUpdateEndpoint: 'tripupdates',
      serviceAlertEndpoint: 'servicealerts',
      apiKeyRequired: true,
      scheduleAlertPullTimeout: 60000,
      ...props,
    })
  }
}

export default AucklandRealtime
