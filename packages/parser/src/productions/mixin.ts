import { TokenType, CstNode, EMPTY_ALT } from 'chevrotain'
import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  const resetState = () => {
    $.isSemiColonSeparated = false
    $.isMixinDefinition = false
  }
  /**
   * Test for mixin start
   */
  $.testMixin = $.RULE('testMixin', () => {
    resetState()

    $.SUBRULE($.mixinStart)
    $.CONSUME($.T.LParen)
    $.MANY(() => {
      $.SUBRULE($.expressionList)
      $.OPTION(() => {
        $.CONSUME($.T.SemiColon)
        $.isSemiColonSeparated = true
      })
    })
    $.CONSUME($.T.RParen)
    $._(1)
    /** Allow when guard */
    $.SUBRULE2($.expressionList)
    $.OPTION2(() => {
      $.CONSUME($.T.LCurly)
      $.isMixinDefinition = true
    })
  })

  $.mixin = $.RULE('mixin', () => {
    $.OR([
      {
        GATE: () => $.isMixinDefinition,
        ALT: () => $.SUBRULE($.mixinDefinition)
      },
      { ALT: () => $.SUBRULE($.mixinCall) }
    ])
  })

  $.mixinStart = $.RULE('mixinStart', () => {
    $.SUBRULE($.mixinName)
    $._()
    $.MANY(() => {
      $.OPTION(() => $.CONSUME($.T.Gt))
      $._(1)
      $.SUBRULE2($.mixinName)
      $._(2)
    })
  })

  $.mixinName = $.RULE('mixinName', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.DotName) },
      { ALT: () => $.CONSUME($.T.HashName) },
      { ALT: () => $.SUBRULE($.interpolate) }
    ])
  })

  $.mixinCall = $.RULE('mixinCall', () => {
    const semiColonSeparated = $.isSemiColonSeparated
    resetState()

    $.AT_LEAST_ONE(() => {
      $.SUBRULE($.mixinName)
    })
    $.CONSUME($.T.LParen)
    $.CONSUME($.T.RParen)
  })

  $.mixinDefinition = $.RULE('mixinDefinition', () => {
    const semiColonSeparated = $.isSemiColonSeparated
    resetState()
  
    $.SUBRULE($.mixinName)
    $._()
    $.OR([
      {
        GATE: () => semiColonSeparated,
        ALT: () => $.SUBRULE($.mixinDefArgsSemi, { LABEL: 'args' })
      },
      { ALT: () => $.SUBRULE($.mixinDefArgsComma, { LABEL: 'args' }) }
    ])
    $._(1)
    $.SUBRULE($.guard)
  })

  $.guard = $.RULE('guard', () => {
    $.OPTION(() => {
      $.CONSUME($.T.When)
      $._(2)
      $.SUBRULE($.guardOr)
    })
  })

  $.guardOr = $.RULE('guardOr', () => {
    $.SUBRULE($.guardAnd, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.Comma)
      $._()
      $.SUBRULE2($.guardAnd, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.guardAnd = $.RULE('guardAnd', () => {
    $.SUBRULE($.guardExpression, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.And)
      $._()
      $.SUBRULE2($.guardExpression, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.guardExpression = $.RULE('guardExpression', () => {
    $.CONSUME($.T.LParen)
    $.SUBRULE($.compare)
    $.CONSUME($.T.RParen)
  })

  $.createMixinDefArgs = (suffix: 'Comma' | 'Semi', SEP: TokenType) =>
    $.RULE(`mixinDefArgs${suffix}`, () => {
      $.CONSUME($.T.LParen, { LABEL: 'L' })
      $.MANY_SEP({
        SEP,
        DEF: () => $.SUBRULE($[`mixinDefArg${suffix}`])
      })
      $.OPTION({
        GATE: () => suffix === 'Semi',
        DEF: () => $.CONSUME($.T.SemiColon)
      })
      $.CONSUME($.T.RParen, { LABEL: 'R' })
    })

  /**
   * Mixin Definition arguments.
   */
  $.mixinDefArgsComma = $.createMixinDefArgs('Comma', $.T.Comma)
  $.mixinDefArgsSemi = $.createMixinDefArgs('Semi', $.T.SemiColon)

  /**
   * e.g. `@var1`
   *      `@var2: value`
   *      `@rest...`
   *      `keyword`
   *
   * @param subrule - $.expression or $.expressionList
   */
  $.createMixinDefArg = (suffix: 'Comma' | 'Semi', subrule: () => CstNode) =>
    $.RULE(`mixinDefArg${suffix}`, () => {
      $._(1)
      $.OR([
        {
          ALT: () => {
            $.CONSUME($.T.AtName)
            $._(2)
            $.OR2([
              {
                ALT: () => {
                  $.CONSUME($.T.Colon)
                  $._(3)
                  $.SUBRULE(subrule)
                }
              },
              {
                ALT: () => {
                  $.CONSUME($.T.Ellipsis)
                }
              },
              { ALT: () => EMPTY_ALT }
            ])
          }
        },
        { ALT: () => $.CONSUME($.T.Ident) }
      ])
      $._(4)
      if (suffix === 'Semi') {
        $.OPTION(() => $.CONSUME($.T.SemiColon))
      }
    })

  $.mixinDefArgComma = $.createMixinDefArg('Comma', $.expression)
  $.mixinDefArgSemi = $.createMixinDefArg('Semi', $.expressionList)
}