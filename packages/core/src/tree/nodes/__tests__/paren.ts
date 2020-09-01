import { expect } from 'chai'
import 'mocha'
import { Paren, Value, ILocationInfo } from '..'

const mockLocation: ILocationInfo = {
  startOffset: 0,
  startLine: 0
}

describe('Paren', () => {
  it('toString()', () => {
    const rule = new Paren([new Value('foo')])
    expect(String(rule)).to.eq('(foo)')
  })
})
