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
        GATE: this.BACKTRACK(this.testMixin),
        ALT: () => this.SUBRULE(this.mixin)
      },
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

  /**
   * Test for mixin start
   */
  testMixin = this.RULE(
    'textMixin',
    (): IToken => {
      this.SUBRULE(this.mixinStart)
      this.WS()
      return this.CONSUME(this.T.LParen)
    }
  )

  mixinStart = this.RULE('mixinStart', () => {
    return this.OR([
      { ALT: () => this.CONSUME(this.T.DotName) },
      { ALT: () => this.CONSUME(this.T.HashName) },
      { ALT: () => this.SUBRULE(this.interpolate) }
    ])
  })

  interpolate = this.RULE('interpolate', () => {
    const values = [
      this.CONSUME(this.T.InterpolatedStart),
      this.CONSUME(this.T.Ident),
      this.CONSUME(this.T.RCurly)
    ]
    return {
      name: 'interpolated',
      children: { values }
    }
  })

  mixin = this.RULE(
    'mixin',
    (): CstNode => {
      const name = this.SUBRULE(this.mixinStart)
      const ws = this.WS()
      const args = this.SUBRULE(this.mixinArgs)
      return {
        name: 'mixin',
        children: {}
      }
    }
  )

  /**
   * Mixin Definition arguments.
   *
   * Capture as if commas were argument separators.
   * Then join if semi-colon not found
   */
  mixinArgs = this.RULE(
    'mixinArgs',
    (): CstNode => {
      const L = [this.CONSUME(this.T.LParen)]
      const args = [this.SUBRULE(this.mixinArg)]
      let sep = [this.WS()]
      this.MANY(() => {
        sep.push(this.CONSUME(this.T.Comma))
        args.push(this.SUBRULE2(this.mixinArg))
        sep.push(this.WS(2))
      })
      const R = [this.CONSUME(this.T.RParen)]
      return {
        name: 'mixinArgs',
        children: {
          L,
          R,
          args,
          sep
        }
      }
    }
  )

  mixinArg = this.RULE(
    'mixinArg',
    (): CstNode => {
      const pre = this.WS()
      this.OR([
        {
          ALT: () => {
            const variable = this.CONSUME(this.T.AtName)
            const pre = this.WS(2)
            const assign = this.CONSUME(this.T.Colon)
            const expr = this.SUBRULE(this.expression)
          }
        }
      ])
      return {
        name: 'arg',
        children: {}
      }
    }
  )
}
