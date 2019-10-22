import { expect } from 'chai'
import 'mocha'
import {
  Name,
  Rules,
  Declaration,
  MergeType,
  Value,
  Variable
} from '..'

import * as tree from '..'

import { context } from '../../__mocks__/context'

describe('Rules', () => {
  it('should serialize rules', () => {
    const node = new Rules([
      new Declaration({ name: 'prop1', nodes: [new Value('foo')], post: ';' }),
      new Declaration({ name: 'prop2', nodes: [new Value('foo')] })
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{prop1:foo;prop2:foo}')
  })

  it('should add a semi-colon automatically', () => {
    const node = new Rules([
      new Declaration({ name: 'prop1', nodes: [new Value('foo')] }),
      new Declaration({ name: 'prop2', nodes: [new Value('foo')] })
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{prop1:foo;prop2:foo}')
  })

  /**
   * Note: until a visitor has removed non-visible nodes
   * (like Variable declarations or Mixin calls/definitions),
   * they will still be serialized in output. This keeps toString()
   * logic in nodes (esp. Rules) very simple.
   */
  it('should resolve variables', () => {
    const node = new Rules([
      new Declaration({ name: 'var', nodes: [new Value('foo')] }, { isVariable: true }),
      new Declaration({ name: 'prop', nodes: [new Variable('var')] })
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{@var:foo;prop:foo}')
  })

  it('should resolve variables (2)', () => {
    const node = new Rules([
      new Declaration({ name: 'prop', nodes: [new Variable('var')] }),
      new Declaration({ name: 'var', nodes: [new Value('foo')] }, { isVariable: true }),
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{prop:foo;@var:foo}')
  })

  it('should resolve variables (3)', () => {
    const node = new Rules([
      new Declaration({ name: 'prop', nodes: [new Variable('var')] }),
      new Declaration({ name: 'var', nodes: [new Value('foo')] }, { isVariable: true }),
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{prop:foo;@var:foo}')
  })

  it('should resolve variables (4)', () => {
    const node = new Rules([
      new Declaration({ name: 'prop', nodes: [new Variable('var')] }),

      /** We can use @varname for easy shorthand, will set `isVariable: true` */
      new Declaration({ name: '@varname', nodes: [new Value('var')] }),
      new Declaration({ name: [new Name([new Variable('varname')])], nodes: [new Value('foo')] }, { isVariable: true }),
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{prop:foo;@varname:var;@var:foo}')
  })

  it('should merge props', () => {
    const node = new Rules([
      new Declaration({ name: 'merge', nodes: [new Value('foo')] }, { mergeType: MergeType.COMMA }),
      new Declaration({ name: 'merge', nodes: [new Value('bar')] }, { mergeType: MergeType.COMMA }),
      new Declaration({ name: 'prop', nodes: [new Variable('merge', { propertyRef: true })] })
    ])
    const val = node.eval(context)
    expect(val.valueOf()).to.eq('{merge:foo;merge:bar;prop:bar,foo}')
  })
})