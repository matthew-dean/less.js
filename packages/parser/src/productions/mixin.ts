import { CstChild, CstNode } from '@less/css-parser'
import { EMPTY_ALT, IToken } from 'chevrotain'
import { Declaration } from 'css-parser/src/productions/declarations'
import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
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
      { ALT: () => $.CONSUME($.T.LParen) }
    ])
  })

  // $.testAnonMixin = $.RULE('testAnonMixin', () => {
  //   $.CONSUME($.T.AnonMixinStart)
  //   $.SUBRULE($.testMixinEnd)
  // })

  // $.testMixinArgs = $.RULE('testMixinArgs', () => {
  //   $.MANY(() => {
  //     $.OR([
  //       { ALT: () => $.SUBRULE($.curlyBlock) },
  //       { ALT: () => $.SUBRULE($.testMixinExpression) }
  //     ])
      
  //     $.OPTION(() => {
  //       $.CONSUME2($.T.SemiColon)
  //       $.isSemiColonSeparated = true
  //     })
  //   })
  //   $.CONSUME($.T.RParen)
  // })

  // $.testMixinEnd = $.RULE('testMixinEnd', () => {
  //   $.SUBRULE($.testMixinArgs)
  //   $._(1)
  //   $.OPTION2(() => {
  //     $.CONSUME($.T.Important)
  //     $._(2)
  //   })
  //   /** 
  //    * Allow when guard
  //    * @todo - simplify test expression for performance? 
  //    */
  //   $.OPTION3(() => $.SUBRULE($.guard))
  //   $.OPTION4(() => {
  //     $.CONSUME($.T.LCurly)
  //     $.isMixinDefinition = true
  //   })
  // })

  // $.testMixinExpression = $.RULE('testMixinExpression', () => {
  //   $.MANY(() => {
  //     $.OR([
  //       { ALT: () => $.CONSUME($.T.Value) },
  //       { ALT: () => $.CONSUME($.T.VarOrProp) },
  //       { ALT: () => $.CONSUME($.T.Comma) },
  //       { ALT: () => $.CONSUME($.T.Colon) },
  //       { ALT: () => $.CONSUME($.T.WS) },
  //       { ALT: () => {
  //         $.OR2([
  //           { ALT: () => $.CONSUME($.T.Function) },
  //           { ALT: () => $.CONSUME($.T.LParen) }
  //         ])
  //         $.SUBRULE($.testMixinExpression)
  //         $.CONSUME($.T.RParen)
  //       }},
  //       { ALT: () => {
  //         $.CONSUME($.T.LSquare)
  //         $.SUBRULE2($.testMixinExpression)
  //         $.CONSUME($.T.RSquare)
  //       }}
  //     ])
  //   })
  // })

  /**
   * To avoid a lot of back-tracking, we parse the mixin start
   * and mixin arguments equally for mixin calls, as it's only
   * the final curlyBlock that determines if this is a definition
   * or a call.
   * 
   * During CST-to-AST, we can throw an error if a mixin definition
   * doesn't have valid selectors or arguments, or if, say, a mixin
   * call has a guard and shouldn't.
   */
  $.mixin = $.RULE<CstNode>('mixin', (inValue: boolean) => {
    const children: CstChild[] = [
      $.SUBRULE($.mixinStart),
      $.CONSUME($.T.LParen),
      $.SUBRULE($.mixinArgs),
      $.CONSUME($.T.RParen),
      $._(1),
      $.OPTION(() => ({
        name: 'important',
        children: [
          $.CONSUME($.T.Important),
          $._(2)
        ]
      }))
    ]
    
    $.OPTION2({
      GATE: () => !inValue,
      DEF: () => $.OR([
        /**
         * Within a declaration value, the semi-colon is part of the declaration
         */
        {
          ALT: () => children.push(undefined, $.CONSUME($.T.SemiColon))
        },
        {
          ALT: () => {
            children.push(
              $.OPTION3(() => $.SUBRULE($.guard)),
              $.SUBRULE($.curlyBlock)
            )
          }
        }
      ])
    })
  
    return {
      name: 'mixin',
      children
    }
  })

  $.mixinStart = $.RULE('mixinStart', () => {
    const children: CstChild[] = [
      $.SUBRULE($.mixinName),
      $._()
    ]
    $.MANY(() => {
      children.push(
        $.OPTION(() => ({
          name: 'combinator',
          children: [
            $.CONSUME($.T.Gt),
            $._(1)
          ]
        })),
        $.SUBRULE2($.mixinName),
        $._(2)
      )
    })
    return {
      name: 'mixinStart',
      children
    }
  })

  $.mixinName = $.RULE('mixinName',
    () => $.OR([
      { ALT: () => $.CONSUME($.T.DotName) },
      { ALT: () => $.CONSUME($.T.HashName) },
      { ALT: () => $.CONSUME($.T.ColorIdentStart) },
      { ALT: () => $.CONSUME($.T.Interpolated) }
    ])
  )

  /**
   * This code gets a bit complicated. Less 2.x-4.x uses
   * lookaheads to find semi-colons, and if found, parses
   * arguments differently.
   * 
   * Instead, here we just allow for semi-colon or comma
   * separators, and if BOTH, then we MERGE comma-separated
   * arguments into the initial expression as an expression
   * list.
   * 
   * This allows us to have one parsing "pass" on arguments
   * without any back-tracking.
   */
  $.mixinArgs = $.RULE('mixinArgs', () => {
    let childrenGroups: any[][] = [[
      $.SUBRULE($.mixinArg)
    ]]
    let children: CstChild[] = childrenGroups[0]
    let groupIndex = 0

    $.MANY(() => {
      $.OR([
        { ALT: () => {
          children.push(
            $.CONSUME($.T.Comma),
            $.SUBRULE2($.mixinArg)
          )
        }},
        { ALT: () => {
          children.push(
            $.CONSUME($.T.SemiColon)
          )

          childrenGroups.push([
            $.SUBRULE3($.mixinArg)
          ])
          groupIndex++
          children = childrenGroups[groupIndex]
        }}
      ])
    })

    if (!this.RECORDING_PHASE && childrenGroups.length !== 1) {
      children = []
      childrenGroups.forEach(group => {
        const length = group.length
        const value: CstNode = group[0].children[1]
        let expr: CstNode
        let exprList: CstNode[] = []

        if (value.name === 'declaration') {
          expr = (<Declaration>value).children[4]
        } else {
          expr = value
        }

        exprList.push(expr)

        for(let i = 1; i < length - 1; i += 2) {
          /** Comma separator */
          exprList.push(group[i])
          expr = group[i + 1].children[1]
          exprList.push(expr)
        }

        const exprListNode = {
          name: 'expressionList',
          children: exprList
        }
        if (value.name === 'Declaration') {
          value.children[4] = exprListNode
        } else {
          group[0].children[1] = exprListNode
        }
        children.push(group[0])
        const semi = group[group.length - 1]
        if (semi?.image === ';') {
          children.push(semi)
        }
      })
    }

    return {
      name: 'mixinArgs',
      children
    }
  })


  /**
   * This will return either a declaration,
   * an expression, or a rest (e.g. `@var...`)
   */
  $.mixinArg = $.RULE('mixinArg', () => {
    let pre = $._(0)

    let varName: IToken
    let ws: IToken
    let assign: IToken
    let postAssign: IToken
    let isDeclaration = false

    $.OPTION(() => {
      /** 
       * In a mixin definition, this is the variable declaration.
       * In a mixin call, this is either assignment to a variable, OR
       * could be part of the expression value.
       */
      varName = $.CONSUME($.T.AtKeyword)
      ws = $._(1)

      $.OPTION2(() => {
        isDeclaration = true
        assign = $.CONSUME($.T.Assign)
        postAssign = $._(2)
      })
    })

    let value: CstChild = $.OR2([
      {
        GATE: () => !isDeclaration && !ws,
        ALT: () => ({
          name: 'rest',
          children: [
            varName,
            $.CONSUME2($.T.Ellipsis)
          ]
        })
      },
      {
        GATE: () => !varName || isDeclaration,
        ALT: () => ({
          name: 'expression',
          children: [$.SUBRULE($.curlyBlock)]
        })
      },
      {
        ALT: () => {
          const expr: CstNode = $.SUBRULE($.expression)
          if (!isDeclaration) {
            if (varName) {
              if (ws) {
                expr.children.unshift(ws)
              }
              expr.children.unshift(varName)
            }
            if (pre) {
              expr.children.unshift(pre)
              pre = undefined
            }
          }
          return expr
        }
      }
    ])

    const post = $._(3)
    let chunk = value

    if (isDeclaration) {
      chunk = <Declaration>{
        name: 'declaration',
        children: [
          varName,
          ws,
          assign,
          postAssign,
          value,
          undefined,
          undefined
        ]
      }
    } else {
      chunk = value
    }

    return {
      name: 'mixinArg',
      children: [
        pre,
        chunk,
        post
      ]
    }
  })

  // $.mixinCall = $.RULE('mixinCall', (semiColonSeparated: boolean) => {
  //   $.AT_LEAST_ONE(() => $.SUBRULE($.mixinName))
  //   $.CONSUME($.T.LParen, { LABEL: 'L' })
  //   $.SUBRULE($.mixinCallArgs, { ARGS: [semiColonSeparated] })
  //   $.CONSUME($.T.RParen, { LABEL: 'R' })
  //   $._(2)
  //   $.OPTION2(() => {
  //     $.CONSUME($.T.Important)
  //     $._(3)
  //   })
  //   $.OPTION3(() => $.CONSUME($.T.SemiColon))
  // })

  // $.mixinDefinition = $.RULE('mixinDefinition', (semiColonSeparated: boolean) => {
  //   $.SUBRULE($.mixinName)
  //   $._()
  //   $.CONSUME($.T.LParen, { LABEL: 'L' })
  //   $.SUBRULE($.mixinDefArgs, { ARGS: [semiColonSeparated] })
  //   $.CONSUME($.T.RParen, { LABEL: 'R' })
  //   $._(1)
  //   $.OPTION(() => $.SUBRULE($.guard))
  //   $.SUBRULE($.curlyBlock)
  // })

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