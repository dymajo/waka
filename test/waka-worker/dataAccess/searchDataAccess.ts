import 'mocha'
import { createLogger } from 'bunyan'
import { expect } from 'chai'
import { instance, mock, when } from 'ts-mockito'

import SearchDataAccess from '../../../src/waka-worker/dataAccess/searchDataAccess'
import SearchSqlRepostory from '../../../src/waka-worker/dataAccess/sql/searchSqlRepository'

const logger = createLogger({ name: 'test-logger' })

describe('waka-worker/dataAccess/searchDataAccess', () => {
  it('should return all route types', async () => {
    const searchDataAccess = new SearchDataAccess({
      prefix: 'fake-prefix',
      connection: null,
      logger,
    })
    const mockedSearchSqlRepository: SearchSqlRepostory = mock(
      SearchSqlRepostory
    )
    when(mockedSearchSqlRepository.getStopsRouteType()).thenResolve([
      {
        stop_id: '1',
        route_type: 2,
      },
    ])
    const searchSqlRepository: SearchSqlRepostory = instance(
      mockedSearchSqlRepository
    )
    searchDataAccess.searchSqlRepository = searchSqlRepository

    const result = await searchDataAccess.getStopsRouteType()
    expect(result['0']).to.be.undefined
    expect(result['1']).to.equal(2)
  })

  it('should cache route types on start', async () => {
    const searchDataAccess = new SearchDataAccess({
      prefix: 'fake-prefix',
      connection: null,
      logger,
    })

    // starts off empty
    expect(searchDataAccess.routeTypesCache).to.deep.equal({})

    const mockedSearchSqlRepository: SearchSqlRepostory = mock(
      SearchSqlRepostory
    )
    when(mockedSearchSqlRepository.getStopsRouteType()).thenResolve([
      {
        stop_id: '1',
        route_type: 2,
      },
    ])
    const searchSqlRepository: SearchSqlRepostory = instance(
      mockedSearchSqlRepository
    )
    searchDataAccess.searchSqlRepository = searchSqlRepository

    // should get an object now
    await searchDataAccess.start()
    expect(searchDataAccess.routeTypesCache).to.deep.equal({ '1': 2 })
  })


  it('should fail safely if there is no database connection', async () => {
    const searchDataAccess = new SearchDataAccess({
      prefix: 'fake-prefix',
      connection: null,
      logger,
    })

    // should not crash
    await searchDataAccess.start()
  })

  it('should get all stops', async () => {
    const searchDataAccess = new SearchDataAccess({
      prefix: 'fake-prefix',
      connection: null,
      logger,
    })
    const mockedSearchSqlRepository: SearchSqlRepostory = mock(
      SearchSqlRepostory
    )
    when(mockedSearchSqlRepository.getStopsRouteType()).thenResolve([
      {
        stop_id: '1',
        route_type: 2,
      },
    ])
    when(mockedSearchSqlRepository.getAllStops()).thenResolve([
      {
        stop_id: '1',
        stop_name: 'TRAIN_STOP',
      },
      {
        stop_id: '2',
        stop_name: 'BUS_STOP',
      },
    ])
    const searchSqlRepository: SearchSqlRepostory = instance(
      mockedSearchSqlRepository
    )
    searchDataAccess.searchSqlRepository = searchSqlRepository

    await searchDataAccess.start()
    const result = await searchDataAccess.getAllStops()
    expect(result.items).to.have.lengthOf(2)
    expect(result.items[0]).to.deep.equal({
      stop_id: '1',
      stop_name: 'TRAIN_STOP',
      route_type: 2,
    })
    expect(result.items[1]).to.deep.equal({
      stop_id: '2',
      stop_name: 'BUS_STOP',
      route_type: 3,
    })
  })

  it('should return a subset of stops', async () => {
    const searchDataAccess = new SearchDataAccess({
      prefix: 'fake-prefix',
      connection: null,
      logger,
    })
    const mockedSearchSqlRepository: SearchSqlRepostory = mock(
      SearchSqlRepostory
    )
    when(mockedSearchSqlRepository.getStopsRouteType()).thenResolve([
      {
        stop_id: '1',
        route_type: 2,
      },
    ])
    when(mockedSearchSqlRepository.getStops(1.35, 2.65, 1, 3, 0)).thenResolve([
      {
        stop_id: '1',
        stop_name: 'TRAIN_STOP',
        stop_lat: 1,
        stop_lon: 1,
        location_type: 0
      },
      {
        stop_id: '2',
        stop_name: 'BUS_STOP',
        stop_lat: 1,
        stop_lon: 1.5,
        location_type: 0
      },
    ])
    const searchSqlRepository: SearchSqlRepostory = instance(
      mockedSearchSqlRepository
    )
    searchDataAccess.searchSqlRepository = searchSqlRepository

    await searchDataAccess.start()
    const result = await searchDataAccess.getStops(2, 2, 65000)
    expect(result.items).to.have.lengthOf(2)
    expect(result.items[0]).to.deep.equal({
      stop_region: 'fake-prefix',
      route_type: 2,
      stop_id: '1',
      stop_name: 'TRAIN_STOP',
      stop_lat: 1,
      stop_lon: 1,
      location_type: 0
    })
    expect(result.items[1]).to.deep.equal({
      stop_region: 'fake-prefix',
      route_type: 3,
      stop_id: '2',
      stop_name: 'BUS_STOP',
      stop_lat: 1,
      stop_lon: 1.5,
      location_type: 0
    })
  })
})
