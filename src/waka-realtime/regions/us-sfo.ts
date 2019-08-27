import axios from 'axios'
import SingleEndpoint from '../SingleEndpoint'
import Redis from '../Redis'
import { Logger } from '../../typings'
import MultiEndpoint from '../MultiEndpoint'

interface SanFranciscoRealtimeProps {
  wakaRedis: Redis
  apiKey: string
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
  logger: Logger
  scheduleUpdatePullTimeout?: number
  scheduleLocationPullTimeout?: number
}

class SanFranciscoRealtime extends MultiEndpoint {
  constructor(props: SanFranciscoRealtimeProps) {
    super({
      axios: axios.create({
        baseURL: 'http://api.511.org/transit',
        headers: {
          Accept: 'application/x-protobuf',
        },
        responseType: 'arraybuffer',
      }),
      vehiclePositionEndpoint: 'vehiclepositions',
      tripUpdateEndpoint: 'tripupdates',
      // need to find a way to get service alerts without the &agency
      serviceAlertEndpoint: 'servicealerts',
      modes: [
        (agency = true) =>
          agency
            ? `?api_key=${props.apiKey}&agency=BA`
            : `?api_key=${props.apiKey}`,
        (agency = true) =>
          agency
            ? `?api_key=${props.apiKey}&agency=CT`
            : `?api_key=${props.apiKey}`,
        (agency = true) =>
          agency
            ? `?api_key=${props.apiKey}&agency=SF`
            : `?api_key=${props.apiKey}`,
      ],
      apiKeyRequired: true,
      ...props,
    })
  }
}

export default SanFranciscoRealtime
