import { expect } from 'chai'
import 'mocha'
import {
  Expression,
  Value,
  Op,
  List,
  Selector,
  WS
} from '..'

import { context } from '../../../__mocks__/context'

describe('Selector', () => {
  it('should expand lists in selectors', () => {
    const rule = new Selector([
      new List([
        new Value('one'),
        new Value('two'),
        new Value('three')
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('one,two,three')
  })

  it('should apply initial combinator to a list', () => {
    const rule = new Selector([
      new Op({ pre: ' ', value: '>', post: ' '}),
      new List([
        new Expression([new Op('+'), new Value('one')]),
        new Expression([new Op('+'), new Value('two')]),
        new Expression([new Op('+'), new Value('three')])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq(' > one, > two, > three')
  })

  it('should apply initial combinator to an expression', () => {
    const rule = new Selector([
      new Op({ value: '+', post: ' '}),
      new Expression([
        new Value('one'),
        new WS(),
        new Value('two'),
        new WS(),
        new Value('three')
      ])
    ])
    const val = rule.eval(context)

    expect(val.valueOf()).to.eq('+one two three')
    expect(val.toString()).to.eq('+ one two three')
    expect(val instanceof Selector).to.eq(true)

    /** Should flatten sub-expressions to only elements */
    // console.log(expr[0].type)
    // expect(expr[0] instanceof Selector).to.eq(true)
    // expect(expr[1] instanceof Selector).to.eq(true)
    // expect(expr[2] instanceof Selector).to.eq(true)
  })

  it('should apply initial combinator to a nested expressions', () => {
    const rule = new Selector([
      new Op({ value: '+', text: '+ ' }),
      new List([
        new Expression([
          new WS(),
          new Value('one'),
          new WS(),
          new Value('two'),
          new WS(),
          new Value('three')
        ]),
        new Expression([
          new Value('four'),
          new WS(),
          new Value('five'),
          new WS(),
          new Value('six')
        ])
      ])
    ])
    const val = rule.eval(context)
    expect(val + '').to.eq('+ one two three,+ four five six')
    const list = val['nodes']

    /** Should be a list of two expressions with 3 elements */
    // expect(list[0]['nodes'].length).to.eq(3)
    // expect(list[1]['nodes'].length).to.eq(3)
    // expect(list[1]['nodes'][0]['nodes'][0].value).to.eq('+')
  })

  // it('should merge expanded values', () => {
  //   /**
  //    * @var: one, two
  //    * .@{var}
  //    */
  //   const rule = new Element([
  //     new Value(''),
  //     new Expression([
  //       new Value('.'),
  //       new List([
  //         new Expression([
  //           new Element(['', 'one'])
  //         ]),
  //         new Expression({
  //           nodes: [
  //             new WS(),
  //             new Element(['', 'two'])
  //           ]
  //         })
  //       ])
  //     ])
  //   ])
  //   const val = rule.eval(context)
  //   expect(val + '').to.eq('.one, .two')
  //   const subElement = val['nodes'][1]['nodes'][0]
  //   expect(subElement['nodes'][0].value).to.eq('')
  //   expect(subElement['nodes'][1].value).to.eq('.two')

  //   /** Sub element should inherit the expression's pre value */
  //   expect(subElement.pre).to.eq(' ')
  // })
})