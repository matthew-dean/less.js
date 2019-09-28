import { expect } from 'chai'
import 'mocha'
import {
  Quoted,
  Value
} from '..'

import { EvalContext } from '../../contexts'
import Default from '../../../options'

describe('Quoted', () => {
  let context: EvalContext
  beforeEach(() => {
    context = new EvalContext({}, Default())
  })

  it('should output a quote', () => {
    const node = new Quoted([new Value('this is the string contents')], { quote: '"' })
    const val = node.eval(context)
    expect(val + '').to.eq('"this is the string contents"')
  })

  it('should escape a quote', () => {
    const node = new Quoted([new Value('this is the string contents')], { quote: '"', escaped: true })
    const val = node.eval(context)
    expect(val + '').to.eq('this is the string contents')
  })

  it('should be equal regardless of quote mark', () => {
    const A = new Quoted([new Value('this is the string contents')], { quote: '"' })
    const B = new Quoted([new Value('this is the string contents')], { quote: "'" })

    expect(A + '').to.eq(B + '')
  })
})