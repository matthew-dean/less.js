import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /**
   * a rule like `.a { b: c; }`
   */
  $.qualifiedRule = $.RULE('qualifiedRule', () => {
    $.SUBRULE($.selectorList)
    $.SUBRULE($.curlyBlock)
  })

  /**
   * Test for qualified rule start
   */
  $.testQualifiedRule = $.RULE('testQualifiedRule', () => {
    $.SUBRULE($.expressionList)
    $.CONSUME($.T.LCurly)
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
   * Blocks assigned to custom properties
   */
  $.customBlock = $.RULE('customBlock', () => {
    $.OR([
      {
        ALT: () => {
          $.OR2([
            { ALT: () => $.CONSUME($.T.LParen, { LABEL: 'L' }) },
            { ALT: () => $.CONSUME($.T.Function, { LABEL: 'Function' }) }
          ])
          $.SUBRULE($.customValue, { LABEL: 'blockBody' })
          $.CONSUME($.T.RParen, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.LSquare, { LABEL: 'L' })
          $.SUBRULE2($.customValue, { LABEL: 'blockBody' })
          $.CONSUME($.T.RSquare, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.LCurly, { LABEL: 'L' })
          $.SUBRULE3($.customValue, { LABEL: 'blockBody' })
          $.CONSUME($.T.RCurly, { LABEL: 'R' })
        }
      }
    ])
  })
}