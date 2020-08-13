import axios from 'axios'
import { Logger } from '../../types'
import CombinedFeed from '../CombinedFeed'
import Redis from '../Redis'

interface CanberraRealtimeProps {
  wakaRedis: Redis
  scheduleUpdatePullTimeout?: number
  logger: Logger
}

class CanberraRealtime extends CombinedFeed {
  constructor(props: CanberraRealtimeProps) {
    super({
      axios: axios.create({
        baseURL: 'http://files.transport.act.gov.au/feeds/lightrail.pb',
        responseType: 'arraybuffer',
        timeout: 5000,
      }),
      ...props,
    })
  }
}

export default CanberraRealtime
