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
      $.OR([
        { ALT: () => $.SUBRULE($.curlyBlock) },
        { ALT: () => $.SUBRULE($.expressionList) }
      ])
      
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
    const isMixinDefinition = $.isMixinDefinition
    const isSemiColonSeparated = $.isSemiColonSeparated
    resetState()
    $.OR([
      {
        GATE: () => isMixinDefinition,
        ALT: () => $.SUBRULE($.mixinDefinition, { ARGS: [isSemiColonSeparated] })
      },
      { ALT: () => $.SUBRULE($.mixinCall, { ARGS: [isSemiColonSeparated] }) }
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

  $.mixinCall = $.RULE('mixinCall', (semiColonSeparated: boolean) => {
    $.AT_LEAST_ONE(() => {
      $.SUBRULE($.mixinName)
    })
    $.SUBRULE($.mixinArgs, { ARGS: [true, semiColonSeparated] })
    $._()
    $.OPTION(() => $.CONSUME($.T.SemiColon))
  })

  $.mixinDefinition = $.RULE('mixinDefinition', (semiColonSeparated: boolean) => {
    $.SUBRULE($.mixinName)
    $._()
    $.SUBRULE($.mixinArgs, { ARGS: [false, semiColonSeparated] })
    $._(1)
    $.SUBRULE($.guard)
    $.SUBRULE($.curlyBlock)
  })

  $.mixinArgs = $.RULE('mixinArgs', (isCall: boolean, semiColonSeparated: boolean) => {
    $.CONSUME($.T.LParen, { LABEL: 'L' })
    $.OPTION({
      GATE: () => $.LA(1).tokenType !== $.T.RParen,
      DEF: () => $.OR([
        {
          GATE: () => semiColonSeparated,
          ALT: () => {
            $.MANY_SEP({
              SEP: $.T.SemiColon,
              DEF: () => $.OR2([
                {
                  GATE: () => isCall,
                  ALT: () => $.SUBRULE($.mixinCallArg, { ARGS: [true] })
                },
                { ALT: () => $.SUBRULE($.mixinDefArg, { ARGS: [true] }) }
              ])
            })
            $.OPTION2(() => $.CONSUME($.T.SemiColon))
          }
        },
        {
          ALT: () => {
            $.MANY_SEP2({
              SEP: $.T.Comma,
              DEF: () => $.OR3([
                {
                  GATE: () => isCall,
                  ALT: () => $.SUBRULE2($.mixinCallArg, { ARGS: [false] })
                },
                { ALT: () => $.SUBRULE2($.mixinDefArg, { ARGS: [false] }) }
              ])
            })
          }
        }
      ])
    })
    $.CONSUME($.T.RParen, { LABEL: 'R' })
  })

  /**
   * e.g. `@var1`
   *      `@var2: value`
   *      `@rest...`
   *      `...`
   *      `keyword`
   *
   * subrule - $.expression or $.expressionList
   */
  $.mixinCallArg = $.RULE('mixinCallArg', (semiColonSeparated: boolean) => {
    $._(1)
    $.OR({
      IGNORE_AMBIGUITIES: true,
      DEF: [
        {
          GATE: () => ($.BACKTRACK($.testVariable)).call($) && !$.isVariableCall,
          ALT: () => $.SUBRULE($.variableDeclaration, { ARGS: [true] })
        },
        { ALT: () => $.SUBRULE($.curlyBlock) },
        {
          GATE: () => semiColonSeparated,
          ALT: () => $.SUBRULE($.expressionList)
        },
        { ALT: () => $.SUBRULE($.expression) }
      ]
    })
    $._(4)
  })

  /**
   * e.g. `@var1`
   *      `@var2: value`
   *      `@rest...`
   *      `...`
   *      `keyword`
   *
   * subrule - $.expression or $.expressionList
   */
  $.mixinDefArg = $.RULE('mixinDefArg', (semiColonSeparated: boolean) => {
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
                $.OR3([
                  {
                    GATE: () => semiColonSeparated,
                    ALT: () =>  $.SUBRULE($.expressionList)
                  },
                  { ALT: () => $.SUBRULE($.expression) }
                ])
                
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
      { ALT: () => $.CONSUME2($.T.Ellipsis) },
      { ALT: () => $.CONSUME($.T.Ident) }
    ])
    $._(4)
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
}