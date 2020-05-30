import * as glob from 'glob'
import * as fs from 'fs'
import * as path from 'path'
import { expect } from 'chai'
import 'mocha'
import { Parser } from '../src'

const testData = path.dirname(require.resolve('@less/test-data'))

const lessParser = new Parser()
const parser = lessParser.parser

describe('can parse any rule', () => {
  it('declaration', () => {
    const lexerResult = lessParser.lexer.tokenize(`color: green;`)
    const lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    const cst = parser.declaration()
    expect(parser.errors.length).to.equal(0)
  })

  it('qualified rule', () => {
    const lexerResult = lessParser.lexer.tokenize(
      `.light when (lightness(@a) > 50%) {
          color: green;
      }`
    )
    const lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    const cst = parser.qualifiedRule()
    expect(parser.errors.length).to.equal(0)
  })

  it('mixin definition', () => {
    const lexerResult = lessParser.lexer.tokenize(
      `.mixin_def_with_colors(@a: white, // in
              @b: 1px //put in @b - causes problems! --->
              ) // the
              when (@a = white) {
          .test-rule {
              color: @b;
          }
      }`
    )
    const lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    const cst = parser.mixinDefinition()
    expect(parser.errors.length).to.equal(0)
  })
})

describe('can parse all Less stylesheets', () => {
  const files = glob.sync(path.relative(process.cwd(), path.join(testData, 'less/**/*.less')))
  files.sort()
  files.forEach(file => {
    it(`${file}`, () => {
      const result = fs.readFileSync(file)
      const { cst, lexerResult } = lessParser.parse(result.toString())
      expect(lexerResult.errors.length).to.equal(0)
      expect(parser.errors.length).to.equal(0)
    })
  })
})

// Skipped until we fix these flows
describe.skip('should throw parsing errors', () => {
  const files = glob.sync(
    path.relative(process.cwd(), path.join(testData, 'errors/parse/**/*.less'))
  )
  files.sort()
  files.forEach(file => {
    it(`${file}`, () => {
      const result = fs.readFileSync(file)
      const { cst, lexerResult, parser } = lessParser.parse(result.toString())
      expect(lexerResult.errors.length).to.equal(0)
      expect(parser.errors.length).to.equal(1)
    })
  })
})
