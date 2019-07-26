import axios from 'axios'
import CombinedFeed from '../CombinedFeed'
import Redis from '../Redis'
import { Logger } from '../../typings'

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
      }),
      ...props,
    })
  }
}

export default CanberraRealtime
