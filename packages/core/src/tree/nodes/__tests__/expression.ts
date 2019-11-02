import { expect } from 'chai'
import 'mocha'
import { Expression, Value, List, Num } from '..'

import { context } from '../../__mocks__/context'

describe('Expression', () => {
  it('should merge expressions', () => {
    const rule = new Expression([new Num(1), new List([new Num(1), new Num(2), new Num(3)])])
    const val = rule.eval(context)
    expect(String(val)).to.eq('11,12,13')
  })

  /**
   * This isn't the way Elements would be parsed (see Element tests),
   * but it just demonstrates string merging logic
   */
  it('should merge elements', () => {
    const rule = new Expression([
      new Value('.'),
      new List([new Value('one'), new Value('two'), new Value('three')])
    ])
    const val = rule.eval(context)
    expect(String(val)).to.eq('.one,.two,.three')
  })
})
