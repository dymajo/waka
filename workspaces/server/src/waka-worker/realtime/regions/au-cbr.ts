import { Logger } from '../../../types'
import Connection from '../../db/connection'
import ProtobufRealtime from '../ProtobufRealtime'


interface CanberraRealtimeProps {
  logger: Logger
  connection: Connection
}

class CanberraRealtime extends ProtobufRealtime {
  constructor(props: CanberraRealtimeProps) {
    super({
      vehicleLocationOptions: {
        url: 'http://files.transport.act.gov.au/feeds/lightrail.pb',
      },
      tripUpdateOptions: {
        url: 'http://files.transport.act.gov.au/feeds/lightrail.pb',
      },
      ...props,
    })
  }
}

export default CanberraRealtime
