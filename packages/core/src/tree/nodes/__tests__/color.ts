import { expect } from 'chai'
import 'mocha'
import { Color, Operation, Op } from '..'
import { context } from '../../__mocks__/context'

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
    let rule = new Color({ value: [10, 10, 10, 0.5] })
    expect(rule.valueOf()).to.eql([10, 10, 10, 0.5])
  })

  it('preserves the string value', () => {
    let rule = new Color({ value: [10, 10, 10, 0.5], text: 'parsedcolor' })
    expect(rule.valueOf()).to.eql([10, 10, 10, 0.5])
    expect(rule.toString()).to.eq('parsedcolor')
  })

  it('removes the text value during ops', () => {
    let A = new Operation([
      new Color('#111'),
      new Op({ text: ' + ', value: '+' }),
      new Color('#222')
    ])
    const val = A.eval(context)
    // console.log(val.toString(), A.toString())
    expect(val.toString()).to.eq('#333333')
    /** Just checks that this operation can be stringified */
    expect(A.toString()).to.eq('#111 + #222')
  })

  /** @todo - test other color methods */
})
