import 'mocha'
import { expect } from 'chai'
import WakaRealtime from '../../src/waka-realtime'

describe('waka-realtime', () => {
  // it('should have not allow bad prefix', () => {
  //   const realtime = new WakaRealtime({
  //     prefix: 'fake',
  //     version: 'not-supplied',
  //     api: {
  //       fake: 'some key',
  //     },
  //   })
  //   expect(realtime.region).to.equal(null)
  // })
  // it('should have default timeout', () => {
  //   const realtime = new WakaRealtime({
  //     prefix: 'au-syd',
  //     version: 'not-supplied',
  //     api: {
  //       'au-syd': 'some key',
  //     },
  //   })
  //   expect(realtime.region.scheduleUpdatePullTimeout).to.equal(15000)
  //   expect(realtime.region.scheduleVehiclePositionPullTimeout).to.equal(15000)
  //   expect(realtime.region.scheduleAlertPullTimeout).to.equal(15000)
  // })
  // it('should not work without apikey', async () => {
  //   try {
  //     const realtime = new WakaRealtime({
  //       prefix: 'au-syd',
  //       version: 'not-supplied',
  //       api: {},
  //     })
  //   } catch (err) {
  //     expect(err).to.be.instanceOf(Error)
  //   }
  // })
})
