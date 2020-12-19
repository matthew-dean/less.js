import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /**
   * a rule like `.a { b: c; }`
   */
  $.qualifiedRule = $.RULE('qualifiedRule', () => {
    return {
      name: 'qualifiedRule',
      children: [
        $.SUBRULE($.selectorList),
        $.SUBRULE($.curlyBlock)
      ]
    }
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
    return {
      name: 'block',
      children: $.OR([
        {
          ALT: () => [
            $.OR2([
              { ALT: () => $.CONSUME($.T.LParen) },
              { ALT: () => $.CONSUME($.T.Function) }
            ]),
            $.SUBRULE($.expressionList),
            $.CONSUME($.T.RParen)
          ]
        },
        {
          ALT: () => [
            $.CONSUME($.T.LSquare),
            $.SUBRULE2($.expressionList),
            $.CONSUME($.T.RSquare)
          ]
        }
      ])
    }
  })

  $.curlyBlock = $.RULE('curlyBlock', () => {
    return {
      name: 'curlyBlock',
      children: [
        $.CONSUME($.T.LCurly, { LABEL: 'L' }),
        $.SUBRULE($.primary, { LABEL: 'blockBody' }),
        $.CONSUME($.T.RCurly, { LABEL: 'R' })
      ]
    }
  })

  /**
   * Blocks assigned to custom properties
   */
  $.customBlock = $.RULE('customBlock', () => {
    return {
      name: 'block',
      children: $.OR([
        {
          ALT: () => [
            $.OR2([
              { ALT: () => $.CONSUME($.T.LParen) },
              { ALT: () => $.CONSUME($.T.Function) }
            ]),
            $.SUBRULE($.customValueOrSemi),
            $.CONSUME($.T.RParen)
          ]
        },
        {
          ALT: () => [
            $.CONSUME($.T.LSquare),
            $.SUBRULE2($.customValueOrSemi),
            $.CONSUME($.T.RSquare)
          ]
        },
        {
          ALT: () => [
            $.CONSUME($.T.LCurly),
            $.SUBRULE3($.customValueOrSemi),
            $.CONSUME($.T.RCurly)
          ]
        }
      ])
    }
  })

  /**
   * Blocks within at-rule preludes
   * (no outer curly blocks)
   */
  $.customPreludeBlock = $.RULE('customPreludeBlock', () => {
    return {
      name: 'block',
      children: $.OR([
        {
          ALT: () => [
            $.OR2([
              { ALT: () => $.CONSUME($.T.LParen) },
              { ALT: () => $.CONSUME($.T.Function) }
            ]),
            $.SUBRULE($.customValueOrSemi),
            $.CONSUME($.T.RParen)
          ]
        },
        {
          ALT: () => [
            $.CONSUME($.T.LSquare),
            $.SUBRULE2($.customValueOrSemi),
            $.CONSUME($.T.RSquare)
          ]
        }
      ])
    }
  })
}