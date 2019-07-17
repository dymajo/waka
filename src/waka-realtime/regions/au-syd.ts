import axios from 'axios'
import MultiEndpoint from '../MultiEndpoint'
import { Logger } from '../../typings'
import Redis from '../Redis'

const modes = [
  'buses',
  'ferries',
  'lightrail/innerwest',
  'lightrail/newcastle',
  'nswtrains',
  'sydneytrains',
  'metro',
]

interface SydneyRealtimeProps {
  redis: Redis
  apiKey: string
  logger: Logger
  scheduleUpdatePullTimeout?: number
  scheduleLocationPullTimeout?: number
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
}

class SydneyRealtime extends MultiEndpoint {
  constructor(props: SydneyRealtimeProps) {
    super({
      axios: axios.create({
        baseURL: 'https://api.transport.nsw.gov.au/v1/gtfs/',
        headers: {
          Authorization: props.apiKey,
        },
        responseType: 'arraybuffer',
      }),
      vehiclePositionEndpoint: 'vehiclepos',
      tripUpdateEndpoint: 'realtime',
      serviceAlertEndpoint: 'alerts',
      modes,
      apiKeyRequired: true,
      ...props,
    })
  }
}

export default SydneyRealtime
