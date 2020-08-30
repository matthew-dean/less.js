import type { LessParser } from '../lessParser'
import { EMPTY_ALT } from 'chevrotain'

export default function(this: LessParser, $: LessParser) {
  const resetState = () => {
    $.hasExtend = false
  }

  $.qualifiedRule = $.OVERRIDE_RULE('qualifiedRule', () => {
    $.SUBRULE($.selectorList)
    const hasExtend = $.hasExtend
    resetState()
    $._()
    $.OR([
      {
        GATE: () => hasExtend,
        ALT: () => {
          $.OR2([
            { ALT: () => $.SUBRULE($.curlyBlock) },
            { ALT: () => $.CONSUME($.T.SemiColon) }
          ])
        }
      },
      {
        ALT: () => $.SUBRULE2($.curlyBlock)
      }
    ])
  })

  $.testQualifiedRule = $.OVERRIDE_RULE('testQualifiedRule', () => {
    $.SUBRULE($.testQualifiedRuleExpression)
    const hasExtend = $.hasExtend
    resetState()

    $.OR([
      { ALT: () => $.CONSUME($.T.LCurly) },
      {
        GATE: () => hasExtend,
        ALT: () => EMPTY_ALT
      }
    ])
  })

  $.testQualifiedRuleExpression = $.OVERRIDE_RULE('testQualifiedRuleExpression', () => {
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.Value) },
        { ALT: () => $.CONSUME($.T.VarOrProp) },
        { ALT: () => $.CONSUME($.T.Comma) },
        { ALT: () => $.CONSUME($.T.Colon) },
        { ALT: () => $.CONSUME($.T.WS) },
        { ALT: () => {
          $.OR2([
            { ALT: () => {
              $.CONSUME($.T.Extend)
              $.hasExtend = true
            }},
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

}