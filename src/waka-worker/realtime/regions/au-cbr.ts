import ProtobufRealtime from '../ProtobufRealtime'

import { CanberraRealtimeProps } from '../../../typings'

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
