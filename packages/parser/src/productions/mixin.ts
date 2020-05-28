import { TokenType, CstNode, EMPTY_ALT } from 'chevrotain'
import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  /**
   * Test for mixin start
   */
  $.testMixin = $.RULE('testMixin', () => {
    $.SUBRULE($.mixinDefStart)
    $._()
    $.CONSUME($.T.LParen)
  })


  $.mixinDefinition = $.RULE('mixinDefinition', () => {
    $.SUBRULE($.mixinDefStart)
    $._()
    $.OR([
      {
        GATE: $.BACKTRACK($.mixinDefArgsSemi),
        ALT: () => $.SUBRULE($.mixinDefArgsSemi, { LABEL: 'args' })
      },
      { ALT: () => $.SUBRULE($.mixinDefArgsComma, { LABEL: 'args' }) }
    ])
    $._(1)
    $.OPTION(() => {
      $.CONSUME($.T.When)
      $._(2)
      $.SUBRULE($.mixinOr)
    })
  })

  $.mixinOr = $.RULE('mixinOr', () => {
    $.SUBRULE($.mixinAnd, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.Comma)
      $._()
      $.SUBRULE2($.mixinAnd, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.mixinAnd = $.RULE('mixinAnd', () => {
    $.SUBRULE($.mixinExpression, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.And)
      $._()
      $.SUBRULE2($.mixinExpression, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.mixinExpression = $.RULE('mixinExpression', () => {
    $.CONSUME($.T.LParen)
    $.SUBRULE($.compare)
    $.CONSUME($.T.RParen)
  })

  $.mixinDefStart = $.RULE('mixinDefStart', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.DotName) },
      { ALT: () => $.CONSUME($.T.HashName) },
      { ALT: () => $.SUBRULE($.interpolate) }
    ])
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
    })

  $.mixinDefArgComma = $.createMixinDefArg('Comma', $.expression)
  $.mixinDefArgSemi = $.createMixinDefArg('Semi', $.expressionList)
}