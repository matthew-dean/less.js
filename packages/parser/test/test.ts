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
    let lexerResult = lessParser.lexer.tokenize(
      `.mixin_def_with_colors(@a: white, // in
              @b: 1px //put in @b - causes problems! --->
              ) // the
              when (@a = white) {
          .test-rule {
              color: @b;
          }
      }`
    )
    let lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.mixinDefinition()
    expect(parser.errors.length).to.equal(0)

    lexerResult = lessParser.lexer.tokenize(
      `.mixin-definition(@a: {}, @b: {default: works;}) {
        @a();
        @b();
      }`
    )
    lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.mixinDefinition()
    expect(parser.errors.length).to.equal(0)

    lexerResult = lessParser.lexer.tokenize(
      `.mixin-definition(@a: {}; @b: {default: works;};) {
        @a();
        @b();
      }`
    )
    lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.primary()
    expect(parser.errors.length).to.equal(0)
  })

  it('mixin call', () => {
    let lexerResult = lessParser.lexer.tokenize(`.mixin-with-guard-inside(0px);`)
    let lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.mixinCall()
    expect(parser.errors.length).to.equal(0)

    lexerResult = lessParser.lexer.tokenize(`.wrap-mixin(@ruleset: {
        color: red;
      });`)
    lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.mixinCall()
    expect(parser.errors.length).to.equal(0)

    lexerResult = lessParser.lexer.tokenize(`.mixin-call({direct: works;}; @b: {named: works;});`)
    lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.primary()
    expect(parser.errors.length).to.equal(0)
  })

  it('variable declaration', () => {
    // let lexerResult =
    //   lessParser.lexer.tokenize(`@ruleset:`)
    // let lexedTokens = lexerResult.tokens
    // parser.input = lexedTokens
    // parser.testVariable()
    // expect(parser.errors.length).to.equal(0)

    let lexerResult = lessParser.lexer.tokenize(`@ruleset: {
        color: red;
      }`)
    let lexedTokens = lexerResult.tokens
    parser.input = lexedTokens
    parser.unknownAtRule()
    expect(parser.errors.length).to.equal(0)
  })
})

describe('can parse all Less stylesheets', () => {
  const files = glob.sync(path.join(testData, 'less/**/*.less'))
  files
    .map(value => path.relative(testData, value))
    .filter(value => [
      'less/errors/mixin-not-defined-2.less'
    ].indexOf(value) === -1)
    .forEach(file => {
      if (file.indexOf('errors/parse') === -1) {
        it(`${file}`, () => {
          const result = fs.readFileSync(path.join(testData, file))
          const { cst, lexerResult } = lessParser.parse(result.toString())
          expect(lexerResult.errors.length).to.equal(0)
          expect(parser.errors.length).to.equal(0)
        })
      }
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
