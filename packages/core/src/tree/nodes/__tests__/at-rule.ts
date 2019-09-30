import { expect } from 'chai'
import 'mocha'
import { AtRule, Value, ILocationInfo } from '..'

const mockLocation: ILocationInfo = {
  startOffset: 0,
  startLine: 0
}

const makeRule = () => new AtRule({
  name: '@test',
  prelude: [new Value(' this is a prelude')],
  post: new Value(';')
}, {}, mockLocation)

describe('AtRule', () => {
  it('toString() - at-rule w/o rules', () => {
    const rule = makeRule()
    expect(rule.toString()).to.eq('@test this is a prelude;')
  })
  it('should clone correctly', () => {
    const rule = makeRule()
    const clone = rule.clone()
    expect(clone.name).to.eq('@test')
    expect(clone.prelude.join('')).to.eq(' this is a prelude')
    expect(clone.post + '').to.eq(';')
  })
})