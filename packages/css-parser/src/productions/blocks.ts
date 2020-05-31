import type { CssParser } from '../cssParser'
import { EMPTY_ALT } from 'chevrotain'

export default function(this: CssParser, $: CssParser) {
  /**
   * a rule like `.a { b: c; }`
   */
  $.qualifiedRule = $.RULE('qualifiedRule', () => {
    $.SUBRULE($.selectorList)
    $.SUBRULE($.curlyBlock)
  })

  /**
   * Test for qualified rule start.
   * 
   * In order to detect specific errors, we backtrack this very permissive rule,
   * which allows almost anything, because we're just determining if this is
   * _intended_ to be a qualified rule, not if it's a valid one.
   */
  $.testQualifiedRule = $.RULE('testQualifiedRule', () => {
    $.SUBRULE($.testQualifiedRuleExpression)
    $.CONSUME($.T.LCurly)
  })

  $.testQualifiedRuleExpression = $.RULE('testQualifiedRuleExpression', () => {
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.Value) },
        { ALT: () => $.CONSUME($.T.Comma) },
        { ALT: () => $.CONSUME($.T.Colon) },
        { ALT: () => $.CONSUME($.T.WS) },
        { ALT: () => {
          $.OR2([
            { ALT: () => $.CONSUME($.T.Function) },
            { ALT: () => $.CONSUME($.T.LParen) }
          ])
          $.SUBRULE($.testQualifiedRuleExpression)
          $.CONSUME($.T.RParen)
        }},
        { ALT: () => {
          $.CONSUME($.T.LSquare)
          $.SUBRULE2($.testQualifiedRuleExpression)
          $.CONSUME($.T.RSquare)
        }}
      ])
    })
  })

  /**
   * ON BLOCKS
   * ---------
   * Everything in `[]` or `()` we evaluate as raw expression lists,
   * or, rather, groups of expression lists (divided by semi-colons).
   *
   * The CSS spec suggests that `[]`, `()`, `{}` should be treated equally,
   * as generic blocks, so I'm not sure of this, but in the language
   * _so far_, there's some distinction between these block types.
   * AFAIK, `[]` is only used formally in CSS grid and with attribute
   * identifiers, and `()` is used for functions and at-rule expressions.
   *
   * It would be great if CSS formalized this distinction, but for now,
   * this seems safe.
   */
  $.block = $.RULE('block', () => {
    $.OR([
      {
        ALT: () => {
          $.OR2([
            { ALT: () => $.CONSUME($.T.LParen, { LABEL: 'L' }) },
            { ALT: () => $.CONSUME($.T.Function, { LABEL: 'Function' }) }
          ])
          $.SUBRULE($.expressionListGroup, { LABEL: 'blockBody' })
          $.CONSUME($.T.RParen, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.LSquare, { LABEL: 'L' })
          $.SUBRULE2($.expressionListGroup, { LABEL: 'blockBody' })
          $.CONSUME($.T.RSquare, { LABEL: 'R' })
        }
      }
    ])
  })

  $.curlyBlock = $.RULE('curlyBlock', () => {
    $.CONSUME($.T.LCurly, { LABEL: 'L' })
    $.SUBRULE($.primary, { LABEL: 'blockBody' })
    $.CONSUME($.T.RCurly, { LABEL: 'R' })
  })

  /**
   * Blocks assigned to custom properties or at-rules
   */
  $.customBlock = $.RULE('customBlock', (inAtRule) => {
    $.OR([
      {
        ALT: () => {
          $.OR2([
            { ALT: () => $.CONSUME($.T.LParen, { LABEL: 'L' }) },
            { ALT: () => $.CONSUME($.T.Function, { LABEL: 'Function' }) }
          ])
          $.SUBRULE($.customValueOrSemi, { LABEL: 'blockBody' })
          $.CONSUME($.T.RParen, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.LSquare, { LABEL: 'L' })
          $.SUBRULE2($.customValueOrSemi, { LABEL: 'blockBody' })
          $.CONSUME($.T.RSquare, { LABEL: 'R' })
        }
      },
      {
        GATE: () => !inAtRule,
        ALT: () => {
          $.CONSUME($.T.LCurly, { LABEL: 'L' })
          $.SUBRULE3($.customValueOrSemi, { LABEL: 'blockBody' })
          $.CONSUME($.T.RCurly, { LABEL: 'R' })
        }
      },
      {
        GATE: () => inAtRule,
        ALT: () => EMPTY_ALT
      }
    ])
  })
}