import { TokenType, IParserConfig } from 'chevrotain'
import { TokenMap, CssParser, Rule } from '@less/css-parser'
import root from './productions/root'
import mixin from './productions/mixin'
import interpolation from './productions/interpolation'
import values from './productions/values'

export class LessParser extends CssParser {
  T: TokenMap
  inCompareBlock: boolean

  interpolate: Rule

  /** values */
  addition: Rule
  multiplication: Rule
  compare: Rule

  /** mixins */
  createMixinDefArgs: Function
  testMixin: Rule
  mixinDefStart: Rule
  mixinDefinition: Rule
  mixinDefArgsSemi: Rule
  mixinDefArgsComma: Rule
  mixinDefArgSemi: Rule
  mixinDefArgComma: Rule
  mixinExpression: Rule
  mixinOr: Rule
  mixinAnd: Rule;

  /** For dynamic references */
  [k: string]: any

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = {
      maxLookahead: 1
    }
  ) {
    super(tokens, T, config)
    const $ = this
    $.T = T

    root.call($, $)
    interpolation.call($, $)
    mixin.call($, $)
    values.call($, $)

    if ($.constructor === LessParser) {
      $.performSelfAnalysis()
    }
  }

  // https://sap.github.io/chevrotain/documentation/6_1_0/classes/baseparser.html#reset
  reset() {
    super.reset()
    this.inCompareBlock = false
  }
}
