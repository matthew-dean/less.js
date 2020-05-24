import { TokenType, IParserConfig, CstNode, EMPTY_ALT } from 'chevrotain'
import { TokenMap, CssParser } from '@less/css-parser'
import overrides from './productions/overrides'
import mixin from './productions/mixin'
import interpolation from './productions/interpolation'

export class LessParser extends CssParser {
  T: TokenMap;
  [k: string]: any

  constructor(tokens: TokenType[], T: TokenMap, config: IParserConfig = { maxLookahead: 1 }) {
    super(tokens, T, config)
    const $ = this
    $.T = T

    overrides.call($, $)
    interpolation.call($, $)
    mixin.call($, $)

    if ($.constructor === LessParser) {
      $.performSelfAnalysis()
    }
  }
}
