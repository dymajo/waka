import axios from 'axios'
import SingleEndpoint from '../SingleEndpoint'
import Redis from '../Redis'
import { Logger } from '../../typings'

interface AucklandRealtimeProps {
  redis: Redis
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
      }),
      vehiclePositionEndpoint: 'vehiclelocations',
      tripUpdateEndpoint: 'tripupdates',
      serviceAlertEndpoint: 'servicealerts',
      apiKeyRequired: true,
      ...props,
    })
  }
}

export default AucklandRealtime
