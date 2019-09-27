import { expect } from 'chai'
import 'mocha'
import {
  Expression,
  Value,
  List,
  Element,
  NumberValue,
} from '..'

import { EvalContext } from '../../contexts'
import Default from '../../../options'

describe('Expression', () => {
  let context: EvalContext
  beforeEach(() => {
    context = new EvalContext({}, Default())
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

  it('should merge elements', () => {
    const rule = new Expression([
      new Value('.'),
      new List([
        new Element(['', 'one']),
        new Element(['', 'two']),
        new Element(['', 'three'])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('.one,.two,.three')
    console.log(val['nodes'][0])
  })
})