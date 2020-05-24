import { TokenType, CstNode, EMPTY_ALT } from 'chevrotain'
import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  /**
   * Test for mixin start
   */
  $.testMixin = $.RULE('textMixin', () => {
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
  })

  $.mixinDefStart = $.RULE('mixinStart', () => {
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