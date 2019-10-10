import { expect } from 'chai'
import 'mocha'
import { Color, Operation, Value } from '..'
import { Context } from '../../context'
import Default from '../../../options'

describe('Color', () => {
  it('accepts hex values', () => {
    let rule = new Color('#FFF')
    expect(rule.valueOf()).to.eql([255, 255, 255, 1])
    rule = new Color('#FFFFFF')
    expect(rule.valueOf()).to.eql([255, 255, 255, 1])
    rule = new Color('#FFFFFFFF')
    expect(rule.valueOf()).to.eql([255, 255, 255, 1])
  })

  it('accepts value arrays', () => {
    let rule = new Color({ value: [10, 10, 10, 0.5]})
    expect(rule.valueOf()).to.eql([10, 10, 10, 0.5])
  })

  it('preserves the string value', () => {
    let rule = new Color({ value: [10, 10, 10, 0.5], text: 'parsedcolor'})
    expect(rule.valueOf()).to.eql([10, 10, 10, 0.5])
    expect(rule.toString()).to.eq('parsedcolor')
  })

  it('removes the text value during ops', () => {
    let A = new Operation([new Color('#111'), new Value({ text: ' + ', value: '+' }), new Color('#222')])
    const val = A.eval(new Context({}, Default()))
    expect(val.toString()).to.eq('#333333')
    /** Just checks that this operation can be stringified */
    expect(A.toString()).to.eq('#111 + #222')
  })
})