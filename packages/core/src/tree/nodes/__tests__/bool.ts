import { expect } from 'chai'
import 'mocha'
import { Bool } from '..'

describe('Bool', () => {
  it('true', () => {
    const rule = new Bool({
      text: 'True',
      value: true
    })
    expect(rule.valueOf()).to.eq(true)
    expect(rule.toString()).to.eq('True')
  })
  it('false', () => {
    const rule = new Bool({
      text: 'FALSE',
      value: false
    })
    expect(rule.valueOf()).to.eq(false)
    expect(rule.toString()).to.eq('FALSE')
  })
  it('works with only a boolean', () => {
    const rule = new Bool(true)
    expect(rule.valueOf()).to.eq(true)
    expect(rule.toString()).to.eq('true')
  })
  it('equals other Bools', () => {
    const A = new Bool(true)
    const B = new Bool({
      text: 'True',
      value: true
    })
    expect(A.compare(B)).to.eq(0)
  })

  it('has predictable inequality', () => {
    const A = new Bool({
      value: false
    })
    const B = new Bool({
      value: true
    })
    /** false is "less than" true */
    expect(A.compare(B)).to.eq(-1)
    expect(B.compare(A)).to.eq(1)
  })
})
