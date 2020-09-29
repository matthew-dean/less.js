import { TokenType, CstNode, EMPTY_ALT } from 'chevrotain'
import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  const resetState = () => {
    $.isSemiColonSeparated = false
    $.isMixinDefinition = false
  }

  /**
   * .mixin .foo la (@foo: bar, blah, ...;)
   */

  /**
   * Test for mixin start
   */
  $.testMixin = $.RULE('testMixin', () => {
    $.SUBRULE($.mixinStart)
    $._()
    $.OR([
      /** Will throw error in 5.x, but allows for better error */
      { ALT: () => $.CONSUME($.T.SemiColon) },
      { ALT: () => {
        $.CONSUME($.T.LParen)
        $.SUBRULE($.testMixinEnd)
      }}
    ])
  })

  $.testAnonMixin = $.RULE('testAnonMixin', () => {
    $.CONSUME($.T.AnonMixinStart)
    $.SUBRULE($.testMixinEnd)
  })

  $.testMixinArgs = $.RULE('testMixinArgs', () => {
    $.MANY(() => {
      $.OR([
        { ALT: () => $.SUBRULE($.curlyBlock) },
        { ALT: () => $.SUBRULE($.testMixinExpression) }
      ])
      
      $.OPTION(() => {
        $.CONSUME2($.T.SemiColon)
        $.isSemiColonSeparated = true
      })
    })
    $.CONSUME($.T.RParen)
  })

  $.testMixinEnd = $.RULE('testMixinEnd', () => {
    $.SUBRULE($.testMixinArgs)
    $._(1)
    $.OPTION2(() => {
      $.CONSUME($.T.Important)
      $._(2)
    })
    /** 
     * Allow when guard
     * @todo - simplify test expression for performance? 
     */
    $.OPTION3(() => $.SUBRULE($.guard))
    $.OPTION4(() => {
      $.CONSUME($.T.LCurly)
      $.isMixinDefinition = true
    })
  })

  $.testMixinExpression = $.RULE('testMixinExpression', () => {
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.Value) },
        { ALT: () => $.CONSUME($.T.VarOrProp) },
        { ALT: () => $.CONSUME($.T.Comma) },
        { ALT: () => $.CONSUME($.T.Colon) },
        { ALT: () => $.CONSUME($.T.WS) },
        { ALT: () => {
          $.OR2([
            { ALT: () => $.CONSUME($.T.Function) },
            { ALT: () => $.CONSUME($.T.LParen) }
          ])
          $.SUBRULE($.testMixinExpression)
          $.CONSUME($.T.RParen)
        }},
        { ALT: () => {
          $.CONSUME($.T.LSquare)
          $.SUBRULE2($.testMixinExpression)
          $.CONSUME($.T.RSquare)
        }}
      ])
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
      $.OPTION(() => {
        $.CONSUME($.T.Gt)
        $._(1)
      })
      $.SUBRULE2($.mixinName)
      $._(2)
    })
  })

  $.mixinName = $.RULE('mixinName', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.DotName) },
      { ALT: () => $.CONSUME($.T.HashName) },
      { ALT: () => $.CONSUME($.T.ColorIdentStart) },
      { ALT: () => $.CONSUME($.T.Interpolated) }
    ])
  })

  $.mixinCall = $.RULE('mixinCall', (semiColonSeparated: boolean) => {
    $.AT_LEAST_ONE(() => $.SUBRULE($.mixinName))
    $.CONSUME($.T.LParen, { LABEL: 'L' })
    $.SUBRULE($.mixinCallArgs, { ARGS: [semiColonSeparated] })
    $.CONSUME($.T.RParen, { LABEL: 'R' })
    $._(2)
    $.OPTION2(() => {
      $.CONSUME($.T.Important)
      $._(3)
    })
    $.OPTION3(() => $.CONSUME($.T.SemiColon))
  })

  $.mixinDefinition = $.RULE('mixinDefinition', (semiColonSeparated: boolean) => {
    $.SUBRULE($.mixinName)
    $._()
    $.CONSUME($.T.LParen, { LABEL: 'L' })
    $.SUBRULE($.mixinDefArgs, { ARGS: [semiColonSeparated] })
    $.CONSUME($.T.RParen, { LABEL: 'R' })
    $._(1)
    $.OPTION(() => $.SUBRULE($.guard))
    $.SUBRULE($.curlyBlock)
  })

  $.mixinCallArgs = $.RULE('mixinCallArgs', (semiColonSeparated: boolean) => {
    $.SUBRULE($.mixinCallArg, { ARGS: [semiColonSeparated] })
    $.MANY(() => {
      $.OR([
        {
          GATE: () => !!semiColonSeparated,
          ALT: () => {
            $.CONSUME($.T.SemiColon)
            $._()
            $.OPTION({
              GATE: () => $.LA(1).tokenType !== $.T.RParen,
              DEF: () => $.SUBRULE2($.mixinCallArg, { ARGS: [true] })
            })
          }
        },
        { ALT: () => {
          $.CONSUME($.T.Comma)
          $._(1)
          $.SUBRULE3($.mixinCallArg, { ARGS: [false] })
        }}
      ])
    })
  })

  $.mixinDefArgs = $.RULE('mixinDefArgs', (semiColonSeparated: boolean) => {
    $._()
    $.OPTION({
      GATE: () => $.LA(1).tokenType !== $.T.RParen,
      DEF: () => {
        $.SUBRULE($.mixinDefArg, { ARGS: [semiColonSeparated] })
        $.MANY(() => {
          $.OR([
            {
              GATE: () => !!semiColonSeparated,
              ALT: () => {
                $.CONSUME($.T.SemiColon)
                $._(1)
                $.OPTION2({
                  GATE: () => $.LA(1).tokenType !== $.T.RParen,
                  DEF: () => $.SUBRULE2($.mixinDefArg, { ARGS: [true] })
                })
              }
            },
            { ALT: () => {
              $.CONSUME($.T.Comma)
              $._(2)
              $.SUBRULE3($.mixinDefArg, { ARGS: [false] })
            }}
          ])
        })
      }
    })
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
  $.mixinArgAssignment = $.RULE('mixinArgAssignment', () => {
    $.CONSUME($.T.AtKeyword)
    $.OR([
      { ALT: () => $.CONSUME($.T.Ellipsis) },
      { ALT: () => {
        $._()
        $.CONSUME($.T.Assign)
      }}
    ])
  })

  $.mixinCallArg = $.RULE('mixinCallArg', (semiColonSeparated: boolean) => {
    $.OPTION({
      GATE: $.BACKTRACK($.mixinArgAssignment),
      DEF: () => $.SUBRULE($.mixinArgAssignment)
    })
    $.OPTION2({
      GATE: () => $.LA(0).tokenType !== $.T.Ellipsis,
      DEF: () => {
        $._()
        $.OR([
          { ALT: () => $.SUBRULE($.curlyBlock) },
          {
            GATE: () => !!semiColonSeparated,
            ALT: () => $.SUBRULE($.expressionList)
          },
          { ALT: () => $.SUBRULE($.expression) }
        ])
      }
    })
    $._(1)
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
                  { ALT: () => $.SUBRULE($.curlyBlock) },
                  {
                    GATE: () => !!semiColonSeparated,
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
      /** 
       * Pattern matching mixin
       *  - Documentation doesn't specify what can be a value for
       *    pattern-matching, but tests have these types:
       */
      { ALT: () => $.CONSUME($.T.Ident) },
      { ALT: () => $.CONSUME($.T.Dimension) },
      { ALT: () => $.CONSUME($.T.Number) },
      { ALT: () => $.CONSUME($.T.StringLiteral) }
    ])
    $._(4)
  })

  /**
   * @note - Guards do not require parens during parsing,
   *         in order to handle recursive nesting.
   *         They should be evaluated during post-processing
   *         (CST visitor?)
   */
  $.guard = $.RULE('guard', () => {
    $.CONSUME($.T.When)
    $._()
    $.SUBRULE($.guardOr)
  })

  /** 'or' expression */
  $.guardOr = $.RULE('guardOr', (disallowComma: boolean) => {
    $.SUBRULE($.guardAnd, { LABEL: 'lhs' })
    $.MANY({
      GATE: () => $.LA(1).tokenType !== $.T.Comma || !disallowComma,
      DEF: () => {
        $.OR([
          { ALT: () => $.CONSUME($.T.Comma) },
          { ALT: () => $.CONSUME($.T.Or) }
        ])
        $._()
        $.SUBRULE2($.guardAnd, { LABEL: 'rhs' })
      }
    })
  })

  /** 
   * 'and' and 'or' expressions
   * 
   *  In Media queries level 4, you cannot have
   *  `([expr]) or ([expr]) and ([expr])` because
   *  of evaluation order ambiguity.
   *  However, Less allows it.
   */
  $.guardAnd = $.RULE('guardAnd', () => {
    $.SUBRULE($.guardExpression, { LABEL: 'lhs' })
    $._()
    $.MANY(() => {
      $.CONSUME($.T.And)
      $._(1)
      $.SUBRULE2($.guardExpression, { LABEL: 'rhs' })
      $._(2)
    })
  })

  $.guardExpression = $.RULE('guardExpression', () => {
    $.OPTION(() => {
      $.CONSUME($.T.Not)
      $._()
    })

    $.SUBRULE($.compare)
  })
}