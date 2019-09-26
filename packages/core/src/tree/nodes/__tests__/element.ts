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

describe('Element', () => {
  let context: EvalContext
  beforeEach(() => {
    context = new EvalContext({}, Default())
  })

  it('should expand lists in elements', () => {
    const rule = new Element([
      new Value(''),
      new List([
        new Element([' ', 'one']),
        new Element([' ', 'two']),
        new Element([' ', 'three'])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('one,two,three')
  })

  it('should apply initial combinator to a list', () => {
    const rule = new Element([
      new Value({ value: '>', text: ' > ' }),
      new List([
        new Element([' ', 'one']),
        new Element([' ', 'two']),
        new Element([' ', 'three'])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq(' > one, > two, > three')
  })

  it('should apply initial combinator to an expression', () => {
    const rule = new Element([
      new Value({ value: '+', text: '+ ' }),
      new Expression([
        new Element([' ', 'one']),
        new Element([' ', 'two']),
        new Element([' ', 'three'])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('+ one two three')
  })

  it('should apply initial combinator to an nested expressions', () => {
    const rule = new Element([
      new Value({ value: '+', text: '+ ' }),
      new List([
        new Expression([
          new Element([' ', 'one']),
          new Element([' ', 'two']),
          new Element([' ', 'three'])
        ]),
        new Expression([
          new Element([' ', 'four']),
          new Element([' ', 'five']),
          new Element([' ', 'six'])
        ])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('+ one two three,+ four five six')
  })
})