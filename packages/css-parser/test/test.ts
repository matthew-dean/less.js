import * as glob from 'glob'
import * as fs from 'fs'
import * as path from 'path'
import { expect } from 'chai'
import 'mocha'
import { Parser } from '../src'

const testData = path.dirname(require.resolve('@less/test-data'))

const cssParser = new Parser()

/**
 * @todo - write error cases
 */
describe('can parse all CSS stylesheets', () => {
  glob.sync('test/css/**/*.css')
    .sort()
    .forEach(file => {
      if (file.indexOf('errors') === -1) {
        it(`${file}`, () => {
          const result = fs.readFileSync(file)
          const { cst, lexerResult, parser } = cssParser.parse(result.toString())
          expect(lexerResult.errors.length).to.equal(0)
          expect(parser.errors.length).to.equal(0)
        })
      }
    })
})

/**
 * These are Less output CSS test files that Less 3.x
 * doesn't recognize as containing invalid CSS, or which
 * are invalid when output.
 */
const invalidCSSOutput = [
  /** Invalid IDs (color values) */
  'css/_main/colors.css',
  /** Contains a less unquoted string in root */
  'css/_main/css-escapes.css',

  /** Invalid CSS selectors */
  'css/_main/css-3.css',
  'css/_main/css-guards.css',
  'css/_main/selectors.css', /* namespace attribute? */

  /** Invalid media queries */
  'css/_main/detached-rulesets.css',
  'css/_main/extend-chaining.css',
  'css/_main/extend-media.css',
  'css/_main/media.css',
  
  /** Intentionally produces invalid CSS */
  'css/_main/import-inline.css',
  ,

  /** @todo - Fix saveError for invalid property name */
  'css/_main/javascript.css',
  'css/_main/mixins-guards-default-func.css',
  'css/_main/property-name-interp.css'
]

/**
 * The CSS output is not re-parseable.
 */
const unrecoverableCSS = [
  'css/_main/import-reference.css'
]

describe('can parse Less CSS output', () => {
  const filterOut = [...invalidCSSOutput, ...unrecoverableCSS]
  glob.sync(path.join(testData, 'css/_main/*.css'))
    .map(value => path.relative(testData, value))
    .filter(value => filterOut.indexOf(value) === -1)
    .sort()
    .forEach(file => {
      it(`${file}`, () => {
        const result = fs.readFileSync(path.join(testData, file))
        const { cst, lexerResult, parser } = cssParser.parse(result.toString())
        expect(lexerResult.errors.length).to.equal(0)
        expect(parser.errors.length).to.equal(0)
      })
  })
})

describe('can parse invalid Less CSS output', () => {
  glob.sync(path.join(testData, 'css/_main/*.css'))
    .map(value => path.relative(testData, value))
    .filter(value => invalidCSSOutput.indexOf(value) !== -1)
    .sort()
    .forEach(file => {
      it(`${file}`, () => {
        const result = fs.readFileSync(path.join(testData, file))
        const { cst, lexerResult, parser } = cssParser.parse(result.toString())
        expect(lexerResult.errors.length).to.equal(0)
        expect(parser.errors.length).to.be.gt(0)
        expect(cst.recoveredNode).to.not.be.true
      })
  })
})