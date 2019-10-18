import { expect } from 'chai'
import 'mocha'

import { context } from '../../__mocks__/context'
import { Color, Num, Value } from '../../tree/nodes'
import colorFunctions from '../color'

const { rgba } = colorFunctions

describe('Functions - color', () => {
  it('#rgba(<Color>)', () => {
    const color = rgba.call(context, new Color('#fff'))
    expect(color.toString()).to.eq('rgb(255, 255, 255)')
  })
  it('#rgba(<Color>, <Num>)', () => {
    const color = rgba.call(context, new Color('#fff'), new Num(0.5))
    expect(color.toString()).to.eq('rgba(255, 255, 255, 0.5)')
  })
  it('#rgba(<Num>, <Num>, <Num>, <Num>)', () => {
    const color = rgba.call(context, new Num(1), new Num(2), new Num(3), new Num(4))
    expect(color.toString()).to.eq('rgba(1, 2, 3, 1)')
  })
  it('#rgba() throws err', () => {
    try {
      const color = rgba.call(context)
    } catch (e) {
      expect(e.message).to.eq('value \'undefined\' is not an expected type. Expected: Color or Num')
      expect(e.pos).to.eq(0)
    }
  })
  it('#rgba(<Color>, <Invalid>) throws err', () => {
    try {
      const color = rgba.call(context, new Color('#fff'), new Value('derp'))
    } catch (e) {
      expect(e.message).to.eq('value \'derp\' is not an expected type. Expected: Num')
      expect(e.pos).to.eq(1)
    }
  })
  // it('should clone correctly', () => {
  //   const rule = makeRule()
  //   const clone = rule.clone()
  //   expect(clone.name).to.eq('@test')
  //   expect(clone.prelude.join('')).to.eq(' this is a prelude')
  //   expect(clone.post + '').to.eq(';')
  // })
})