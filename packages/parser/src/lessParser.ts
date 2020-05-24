import { TokenType, IParserConfig, CstNode, EMPTY_ALT } from 'chevrotain'
import { TokenMap, CssParser } from '@less/css-parser'

export class LessParser extends CssParser {
  T: TokenMap;
  [k: string]: any

  constructor(tokens: TokenType[], T: TokenMap, config: IParserConfig = { maxLookahead: 1 }) {
    super(tokens, T, config)
    this.T = T
    if (this.constructor === LessParser) {
      this.performSelfAnalysis()
    }
  }

  rule = this.OVERRIDE_RULE('rule', () => {
    this._()
    this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.customDeclaration) },
      {
        GATE: this.BACKTRACK(this.testMixin),
        ALT: () => this.SUBRULE(this.mixinDefinition)
      },
      {
        GATE: this.BACKTRACK(this.testQualifiedRule),
        ALT: () => this.SUBRULE(this.qualifiedRule)
      },
      { ALT: () => this.SUBRULE2(this.declaration) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => this.CONSUME(this.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
  })

  /**
   * Test for mixin start
   */
  testMixin = this.RULE('textMixin', () => {
    this.SUBRULE(this.mixinDefStart)
    this._()
    this.CONSUME(this.T.LParen)
  })

  interpolate = this.RULE('interpolate', () => {
    this.CONSUME(this.T.InterpolatedStart), this.CONSUME(this.T.Ident), this.CONSUME(this.T.RCurly)
  })

  mixinDefinition = this.RULE('mixinDefinition', () => {
    this.SUBRULE(this.mixinDefStart)
    this._()
    this.OR([
      {
        GATE: this.BACKTRACK(this.mixinDefArgsSemi),
        ALT: () => this.SUBRULE(this.mixinDefArgsSemi, { LABEL: 'args' })
      },
      { ALT: () => this.SUBRULE(this.mixinDefArgsComma, { LABEL: 'args' }) }
    ])
  })

  mixinDefStart = this.RULE('mixinStart', () => {
    this.OR([
      { ALT: () => this.CONSUME(this.T.DotName) },
      { ALT: () => this.CONSUME(this.T.HashName) },
      { ALT: () => this.SUBRULE(this.interpolate) }
    ])
  })

  createMixinDefArgs = (suffix: 'Comma' | 'Semi', SEP: TokenType) =>
    this.RULE(`mixinDefArgs${suffix}`, () => {
      this.CONSUME(this.T.LParen, { LABEL: 'L' })
      this.MANY_SEP({
        SEP,
        DEF: () => this.SUBRULE(this[`mixinDefArg${suffix}`])
      })
      this.CONSUME(this.T.RParen, { LABEL: 'R' })
    })

  /**
   * Mixin Definition arguments.
   */
  mixinDefArgsComma = this.createMixinDefArgs('Comma', this.T.Comma)
  mixinDefArgsSemi = this.createMixinDefArgs('Semi', this.T.SemiColon)

  /**
   * e.g. `@var1`
   *      `@var2: value`
   *      `@rest...`
   *      `keyword`
   *
   * @param subrule - this.expression or this.expressionList
   */
  createMixinDefArg = (suffix: 'Comma' | 'Semi', subrule: () => CstNode) =>
    this.RULE(`mixinDefArg${suffix}`, () => {
      this._(1)
      this.OR([
        {
          ALT: () => {
            this.CONSUME(this.T.AtName)
            this._(2)
            this.OR2([
              {
                ALT: () => {
                  this.CONSUME(this.T.Colon)
                  this._(3)
                  this.SUBRULE(subrule)
                }
              },
              {
                ALT: () => {
                  this.CONSUME(this.T.Ellipsis)
                }
              },
              { ALT: () => EMPTY_ALT }
            ])
          }
        },
        { ALT: () => this.CONSUME(this.T.Ident) }
      ])
      this._(4)
    })

  mixinDefArgComma = this.createMixinDefArg('Comma', this.expression)
  mixinDefArgSemi = this.createMixinDefArg('Semi', this.expressionList)
}
