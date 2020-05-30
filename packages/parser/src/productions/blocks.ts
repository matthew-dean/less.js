import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.qualifiedRule = $.OVERRIDE_RULE('qualifiedRule', () => {
    $.SUBRULE($.selectorList)
    $.SUBRULE($.guard)
    $.SUBRULE($.curlyBlock)
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