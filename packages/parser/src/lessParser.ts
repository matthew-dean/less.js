import { TokenType, IParserConfig } from 'chevrotain'
import { TokenMap, CssParser, Rule } from '@less/css-parser'
import root from './productions/root'
import blocks from './productions/blocks'
import mixin from './productions/mixin'
import selectors from './productions/selectors'
import interpolation from './productions/interpolation'
import values from './productions/values'

export class LessParser extends CssParser {
  T: TokenMap
  inCompareBlock: boolean = false
  isMixinDefinition: boolean = false
  isSemiColonSeparated: boolean = false

  interpolate: Rule

  /** values */
  addition: Rule
  multiplication: Rule
  compare: Rule
  function: Rule

  /** mixins */
  createMixinDefArgs: Function
  createMixinDefArg: Function
  testMixin: Rule
  mixin: Rule
  mixinName: Rule
  mixinStart: Rule

  /** Mixin definition */
  mixinDefinition: Rule
  mixinDefArgsSemi: Rule
  mixinDefArgsComma: Rule
  mixinDefArgSemi: Rule
  mixinDefArgComma: Rule

  /** Mixin call */
  mixinCall: Rule

  /** guards */
  guard: Rule
  guardExpression: Rule
  guardOr: Rule
  guardAnd: Rule


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
    blocks.call($, $)
    interpolation.call($, $)
    mixin.call($, $)
    selectors.call($, $)
    values.call($, $)

    if ($.constructor === LessParser) {
      $.performSelfAnalysis()
    }
  }

  // https://sap.github.io/chevrotain/documentation/6_1_0/classes/baseparser.html#reset
  reset() {
    super.reset()
    this.inCompareBlock = false
    this.isMixinDefinition = false
    this.isSemiColonSeparated = false
  }
}
