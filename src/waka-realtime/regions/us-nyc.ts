import axios from 'axios'
import { Logger } from '../../typings'
import Redis from '../Redis'
import MultiCombinedFeed from '../MultiCombinedFeed'

interface NYCRealtimeProps {
  wakaRedis: Redis
  apiKey: string
  logger: Logger
  scheduleUpdatePullTimeout?: number
  scheduleLocationPullTimeout?: number
  rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>
}

class NYCRealtime extends MultiCombinedFeed {
  constructor(props: NYCRealtimeProps) {
    super({
      modes: [
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=1`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=2`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=11`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=16`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=21`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=26`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=31`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=36`,
        `http://datamine.mta.info/mta_esi.php?key=${props.apiKey}&feed_id=51`,
        `https://mnorth.prod.acquia-sites.com/wse/gtfsrtwebapi/v1/gtfsrt/${props.apiKey}/getfeed`,
        `https://mnorth.prod.acquia-sites.com/wse/LIRR/gtfsrt/realtime/${props.apiKey}/proto`,
      ],
      axios: axios.create({
        headers: {
          accept: 'application/x-protobuf',
        },
        responseType: 'arraybuffer',
      }),
      ...props,
    })
  }
}

export default NYCRealtime
