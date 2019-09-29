import { expect } from 'chai'
import 'mocha'
import {
  Bool,
  Block,
  Condition,
  Value,
  NumberValue
} from '..'

import { EvalContext } from '../../contexts'
import Default from '../../../options'

describe('Condition', () => {
  let context: EvalContext
  beforeEach(() => {
    context = new EvalContext({}, Default())
  })

  it('should evaluate a simple condition', () => {
    const node = new Condition([
      new Bool(true),
      new Value('and'),
      new Bool(true)
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(true)
  })

  it('should evaluate to false', () => {
    const node = new Condition([
      new Bool({ value: true }),
      new Value('and'),
      new Bool({ value: false })
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(false)
  })

  it('should evaluate to true', () => {
    const node = new Condition([
      new Bool({ value: true }),
      new Value('or'),
      new Bool({ value: false })
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(true)
  })

  it('1 < 1', () => {
    const node = new Condition([
      new NumberValue(1),
      new Value('<'),
      new NumberValue(1)
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(false)
  })

  it('1 <= 1', () => {
    const node = new Condition([
      new NumberValue(1),
      new Value('<='),
      new NumberValue(1)
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(true)
  })

  it('2 > 1', () => {
    const node = new Condition([
      new NumberValue(2),
      new Value('>'),
      new NumberValue(1)
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(true)
  })

  it('1 >= 2', () => {
    const node = new Condition([
      new NumberValue(1),
      new Value('>='),
      new NumberValue(2)
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(false)
  })

  it('1 = 1', () => {
    const node = new Condition([
      new NumberValue(1),
      new Value('='),
      new NumberValue(1)
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(true)
  })

  it('should collapse compares', () => {
    const node = new Condition([
      new Bool({ value: true }),
      new Value('and'),
      new Condition([
        new NumberValue(1),
        new Value('='),
        new NumberValue(2)
      ])
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(false)
  })

  it('should collapse blocks', () => {
    const node = new Condition([
      new Bool({ value: true }),
      new Value('and'),
      new Block([
        new Value('('),
        new Condition([
          new NumberValue(1),
          new Value('='),
          new NumberValue(2)
        ]),
        new Value(')')
      ])
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(false)
  })

  it('should collapse blocks (2)', () => {
    const node = new Condition([
      new Bool({ value: true }),
      new Value('and'),
      new Block([
        new Value('('),
        new Condition([
          new NumberValue(1),
          new Value('='),
          new NumberValue(1)
        ]),
        new Value(')')
      ])
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq(true)
  })
})