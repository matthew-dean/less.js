import { expect } from 'chai'
import 'mocha'
import { Block, Value, ILocationInfo } from '..'

const mockLocation: ILocationInfo = {
  startOffset: 0,
  startLine: 0
}

describe('Block', () => {
  it('toString() - at-rule w/o rules', () => {
    const rule = new Block([new Value('')])
    expect(rule + '').to.eq('@test this is a prelude;')
  })
})