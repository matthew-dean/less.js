import { expect } from 'chai'
import 'mocha'
import {
  Expression,
  Value,
  List,
  Element
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
    const expr = val['nodes']
    expect(val + '').to.eq('+ one two three')

    /** Should flatten sub-expressions to only elements */
    expect(expr[0] instanceof Element).to.eq(true)
    expect(expr[1] instanceof Element).to.eq(true)
    expect(expr[2] instanceof Element).to.eq(true)
  })

  it('should apply initial combinator to a nested expressions', () => {
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
    const list = val['nodes']

    /** Should be a list of two expressions with 3 elements */
    expect(list[0]['nodes'].length).to.eq(3)
    expect(list[1]['nodes'].length).to.eq(3)
    expect(list[1]['nodes'][0]['nodes'][0].value).to.eq('+')
  })
})