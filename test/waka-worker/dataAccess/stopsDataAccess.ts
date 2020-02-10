import 'mocha'
import { expect } from 'chai'
import { instance, mock, when } from 'ts-mockito'

import StopsDataAccess from '../../../src/waka-worker/dataAccess/stopsDataAccess'
import StopsSqlRepostory from '../../../src/waka-worker/dataAccess/sql/stopsSqlRepository'

describe('waka-worker/dataAccess/stopsDataAccess', () => {
  it('should return bounds', async () => {
    const stopsDataAccess = new StopsDataAccess({
      prefix: 'fake-prefix',
      connection: null,
    })
    const mockedStopsSqlRepository: StopsSqlRepostory = mock(StopsSqlRepostory)
    when(mockedStopsSqlRepository.getBounds()).thenResolve([
      {
        lat_min: 1.1,
        lat_max: -2.2,
        lon_min: 3.3,
        lon_max: 4.4,
      },
    ])
    const stopsSqlRepository: StopsSqlRepostory = instance(
      mockedStopsSqlRepository
    )
    stopsDataAccess.stopsSqlRepository = stopsSqlRepository

    const result = await stopsDataAccess.getBounds()
    expect(result).to.deep.equal({
      lat: {
        min: 1.1,
        max: -2.2,
      },
      lon: {
        min: 3.3,
        max: 4.4,
      },
    })
  })

  it('should return stop info', async () => {
    const stopsDataAccess = new StopsDataAccess({
      prefix: 'fake-prefix',
      connection: null,
    })
    const mockedStopsSqlRepository: StopsSqlRepostory = mock(StopsSqlRepostory)
    when(mockedStopsSqlRepository.getStopInfo('1')).thenResolve([
      {
        stop_id: '1',
        stop_desc: null,
        stop_lat: 1,
        stop_lon: 1,
        stop_name: 'fake stop',
        zone_id: null,
        location_type: 0,
        parent_station: null,
        stop_timezone: null,
        wheelchair_boarding: null,
        route_type: 1,
      },
    ])
    const stopsSqlRepository: StopsSqlRepostory = instance(
      mockedStopsSqlRepository
    )
    stopsDataAccess.stopsSqlRepository = stopsSqlRepository

    // these assertions should be good enough
    const result = await stopsDataAccess.getStopInfo('1')
    expect(result.prefix).to.equal('fake-prefix')
    expect(result.stop_id).to.equal('1')
    expect(result.stop_name).to.equal('fake stop')
  })

  it('should throw an error if the stop does not exist', async () => {
    const stopsDataAccess = new StopsDataAccess({
      prefix: 'fake-prefix',
      connection: null,
    })
    const mockedStopsSqlRepository: StopsSqlRepostory = mock(StopsSqlRepostory)
    when(mockedStopsSqlRepository.getStopInfo('1')).thenResolve([])
    const stopsSqlRepository: StopsSqlRepostory = instance(
      mockedStopsSqlRepository
    )
    stopsDataAccess.stopsSqlRepository = stopsSqlRepository

    await stopsDataAccess
      .getStopInfo('1')
      .catch(err => expect(err.message).to.equal('404'))
  })

  it('should get the transfers for stations & parent stations', async () => {
    const stopsDataAccess = new StopsDataAccess({
      prefix: 'fake-prefix',
      connection: null,
    })
    const mockedStopsSqlRepository: StopsSqlRepostory = mock(StopsSqlRepostory)
    // two stops with the same + different routes
    when(mockedStopsSqlRepository.getRoutesAtStops()).thenResolve([
      {
        stop_id: 'STOP1',
        route_short_name: 'ROUTE1',
        agency_id: 'AGENCY1',
      },
      {
        stop_id: 'STOP1',
        route_short_name: 'ROUTE2',
        agency_id: 'AGENCY2',
      },
      {
        stop_id: 'STOP2',
        route_short_name: 'ROUTE2',
        agency_id: 'AGENCY2',
      },
      {
        stop_id: 'STOP2',
        route_short_name: 'ROUTE3',
        agency_id: 'AGENCY3',
      },
    ])
    // both the stops have the same parent stop
    when(mockedStopsSqlRepository.getParentStops()).thenResolve([
      {
        stop_id: 'STOP1',
        parent_station: 'PARENTSTOP1',
      },
      {
        stop_id: 'STOP2',
        parent_station: 'PARENTSTOP1',
      },
    ])
    const stopsSqlRepository: StopsSqlRepostory = instance(
      mockedStopsSqlRepository
    )
    stopsDataAccess.stopsSqlRepository = stopsSqlRepository

    const result = await stopsDataAccess.getTransfers()
    expect(result).to.have.keys(['STOP1', 'STOP2', 'PARENTSTOP1'])
    expect(result['STOP1']).to.deep.equal(['AGENCY1/ROUTE1', 'AGENCY2/ROUTE2'])
    expect(result['STOP2']).to.deep.equal(['AGENCY2/ROUTE2', 'AGENCY3/ROUTE3'])
    expect(result['PARENTSTOP1']).to.deep.equal([
      'AGENCY1/ROUTE1',
      'AGENCY2/ROUTE2',
      'AGENCY3/ROUTE3',
    ])
  })
})
