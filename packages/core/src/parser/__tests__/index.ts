import { expect } from 'chai'
import 'mocha'

import { AstParser } from '..'

const parser = new AstParser()

describe('CST-to-AST', () => {
  it(`a { b: c }`, (done) => {
    parser.parse(`a { b: c }`, (err, node) => {
      console.log(node)
      done()
    })
  })
})