import axios from 'axios'
import { Logger } from '../../types'
import Redis from '../Redis'
import SingleEndpoint from '../SingleEndpoint'

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
        timeout: 5000,
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
