import { expect } from 'chai'
import 'mocha'

import { AstParser } from '..'

const parser = new AstParser()

describe('CST-to-AST', () => {
  it(`rule #1`, done => {
    const styles = `a, d.e {
      b:/** comment *//** */ c/** d */e
    }//bar`
    parser.parse(styles, (err, node) => {
      expect(node.toString()).to.eq(styles)
      done()
    })
  })
})
