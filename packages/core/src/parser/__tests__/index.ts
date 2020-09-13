import { expect } from 'chai'
import 'mocha'

import { AstParser } from '..'

const parser = new AstParser()

describe('CST-to-AST', () => {
  it(`a, d.e { b: c }`, (done) => {
    parser.parse(`a, d.e { b: c }`, (err, node) => {
      console.log(node)
      done()
    })
  })
})