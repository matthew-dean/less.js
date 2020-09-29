import { expect } from 'chai'
import 'mocha'

import { AstParser } from '..'

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
})
