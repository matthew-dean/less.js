import { expect } from 'chai'
import 'mocha'

import { AstParser } from '..'
import { context } from '../../tree/__mocks__/context'

const parser = new AstParser()

const serialize = (str: string) => {
  return (done: Mocha.Done) => {
    parser.parse(str, (err, node) => {
      expect(node.toString()).to.eq(str)
      done()
    })
  }
}

describe('CST-to-AST -- reserializes', () => {
  it(`rule #1`, serialize(
    `a, d.e {
      b: c d e;
    }`
  ))
  
  it(`rule #2`, serialize(
    `a, d.e {
      b:/** comment *//** */ c/** d */e
    }//bar`
  ))

  it(`rule #3`, serialize(
    `a {
      b: 1 + 2 + 3;
    }`
  ))

  it(`rule #4`, serialize(
    `a {
      b: 1 + 2 * 3;
    }`
  ))

  it(`rule #5`, done => {
    const less = `a {
      b: 1 + 2 * 3 * 4;
    }`
    parser.parse(less, (err, node) => {
      expect(node.toString()).to.eq(less)
      expect(node.eval(context).toString()).to.eq('a {\n      b: 25;\n    }')
      done()
    })
  })
})
