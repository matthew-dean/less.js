import { TokenType, IParserConfig, IToken, CstNode, CstElement, EMPTY_ALT } from 'chevrotain'
import { TokenMap, CssParser } from '@less/css-parser'

export class LessParser extends CssParser {
  T: TokenMap

  constructor(tokens: TokenType[], T: TokenMap, config: IParserConfig = { maxLookahead: 1 }) {
    super(tokens, T, config)
    this.T = T
    if (this.constructor === LessParser) {
      this.performSelfAnalysis()
    }
  }

  rule = this.OVERRIDE_RULE('rule', (): CstNode | undefined => {
    const ws = this.WS()
    const rule: CstNode = this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.customDeclaration) },
      {
        GATE: this.BACKTRACK(this.testQualifiedRule),
        ALT: () => this.SUBRULE(this.qualifiedRule)
      },
      { ALT: () => this.SUBRULE2(this.declaration) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => this.SUBRULE(this.semi) },
      { ALT: () => EMPTY_ALT }
    ])

    if (rule.children) {
      if (ws) {
        rule.children.pre = [ws]
      }
      return rule
    } else if (ws) {
      return {
        name: 'ws',
        children: {
          value: [ws]
        }
      }
    }
  })
}
