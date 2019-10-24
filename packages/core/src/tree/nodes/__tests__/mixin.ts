import { expect } from 'chai'
import 'mocha'
import {
  Mixin,
  Rules,
  RulesCall,
  Declaration,
  Value
} from '..'

import { context } from '../../__mocks__/context'

describe('Mixin', () => {
  it('should return rules', () => {
    const mixin = new Mixin({
      name: '#foo',
      rules: [
        new Rules([new Declaration({name: 'foo', nodes: [new Value('bar')]})])
      ]
    })
    const call = new RulesCall({ name: '#foo', args: []})
    const rules = new Rules([mixin, call])
    const result = rules.eval(context)
    console.log(call.toString())
    console.log(result.toString())
  })
})