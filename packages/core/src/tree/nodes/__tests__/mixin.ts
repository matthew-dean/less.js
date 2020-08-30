import { expect } from 'chai'
import 'mocha'
import { Mixin, Rules, RulesCall, Declaration, Value } from '..'

import { context } from '../../__mocks__/context'

describe('Mixin', () => {
  it('should return rules', () => {
    const mixin = new Mixin({
      name: '#foo',
      rules: new Rules([new Declaration({ name: 'foo', nodes: [new Value('bar')] })])
    })
    const call = new RulesCall({ name: '#foo', args: [] })
    const rules = new Rules([mixin, call])
    const result = rules.eval(context)
    // console.log(result.nodes[0].parent)
    // console.log(1, call.toString())
    // console.log(2, result.toString())
  })
})
