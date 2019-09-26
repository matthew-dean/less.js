import { expect } from 'chai'
import 'mocha'
import { Block, Value, ILocationInfo } from '..'

const mockLocation: ILocationInfo = {
  startOffset: 0,
  startLine: 0
}

describe('Block', () => {
  it('toString()', () => {
    const rule = new Block([new Value('('), new Value('foo'), new Value(')')])
    expect(rule + '').to.eq('(foo)')
  })
})