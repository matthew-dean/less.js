import { expect } from 'chai'
import 'mocha'
import {
  Expression,
  Value,
  List,
  NumberValue,
} from '..'

import { Context } from '../../context'
import Default from '../../../options'

describe('Expression', () => {
  let context: Context
  beforeEach(() => {
    context = new Context({}, Default())
  })

  it('should merge expressions', () => {
    const rule = new Expression([
      new NumberValue(1),
      new List([
        new NumberValue(1),
        new NumberValue(2),
        new NumberValue(3)
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('11,12,13')
  })

  /**
   * This isn't the way Elements would be parsed (see Element tests),
   * but it just demonstrates string merging logic
   */
  it('should merge elements', () => {
    const rule = new Expression([
      new Value('.'),
      new List([
        new Value('one'),
        new Value('two'),
        new Value('three')
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('.one,.two,.three')
  })
})