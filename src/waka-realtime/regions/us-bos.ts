import axios from 'axios'
import SingleEndpoint from '../SingleEndpoint'
import Redis from '../Redis'
import { Logger } from '../../typings'

interface BostonRealtimeProps {
  wakaRedis: Redis
  logger: Logger
  scheduleUpdatePullTimeout?: number
  scheduleLocationPullTimeout?: number
}

class BostonRealtime extends SingleEndpoint {
  constructor(props: BostonRealtimeProps) {
    super({
      axios: axios.create({
        baseURL: 'https://cdn.mbta.com/realtime/',
        headers: {
          Accept: 'application/x-protobuf',
        },
        responseType: 'arraybuffer',
      }),
      vehiclePositionEndpoint: 'VehiclePositions.pb',
      tripUpdateEndpoint: 'TripUpdates.pb',
      serviceAlertEndpoint: 'Alerts.pb',
      // apiKeyRequired: true,
      ...props,
    })
  }
}

export default BostonRealtime
