import 'mocha'
import { expect } from 'chai'

import { sortFn } from '../src/utils'

describe('shared/utils/sortFn', () => {
  it('should sort lines in numeric order', () => {
    const lines1 = [['1', ''], ['10', '']].sort(sortFn)
    const lines2 = [['100', ''], ['10', ''], ['1', '']].sort(sortFn)
    expect(lines1[1][0]).to.equal('10')
    expect(lines2[2][0]).to.equal('100')
  })

  it('should sort lines numerically and ignore letter suffixes', () => {
    const lines1 = [['25X', ''], ['25', '']].sort(sortFn)
    const lines2 = [['27', ''], ['26', ''], ['26X', '']].sort(sortFn)
    expect(lines1[1][0]).to.equal('25X')
    expect(lines2[1][0]).to.equal('26X')
    expect(lines2[2][0]).to.equal('27')
  })

  it('should sort lettered services first', () => {
    const lines1 = [['25', ''], ['EAST', '']].sort(sortFn)
    const lines2 = [['27', ''], ['EAST', ''], ['26X', '']].sort(sortFn)
    expect(lines1[0][0]).to.equal('EAST')
    expect(lines2[0][0]).to.equal('EAST')
    expect(lines2[1][0]).to.equal('26X')
  })

  it('should sort night buses last', () => {
    const nightBuses1 = [['N1', ''], ['1', '']].sort(sortFn)
    const nightBuses2 = [['N1', ''], ['1', ''], ['N2', '']].sort(sortFn)
    const nightBuses3 = [['1', ''], ['N2', ''], ['EAST', '']].sort(sortFn)
    expect(nightBuses1[1][0]).to.equal('N1')
    expect(nightBuses2[2][0]).to.equal('N2')
    expect(nightBuses3[1][0]).to.equal('1')
    expect(nightBuses3[2][0]).to.equal('N2')
  })
})
