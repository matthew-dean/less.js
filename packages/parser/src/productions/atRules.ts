import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.unknownAtRule = $.OVERRIDE_RULE('unknownAtRule', () => {
    $.CONSUME($.T.AtKeyword)
    const ws = $._()
    $.OR({
      /**
       * A prelude could have a colon too, so the last two rules are
       * ambiguous, but any unknown at-rule in the form of `@rule:`
       * is assumed to be a variable assignment
       */
      IGNORE_AMBIGUITIES: true,
      DEF: [
        {
          GATE: () => !ws,
          ALT: () => {
            /** Variable call */
            $.CONSUME($.T.LParen)
            $.CONSUME($.T.RParen)
          }
        },
        {
          ALT: () => {
            /** Variable assignment */
            $.CONSUME($.T.Colon)
            $._(1)
            $.OR2([
              { ALT: () => $.SUBRULE($.curlyBlock) },
              { ALT: () => $.SUBRULE($.expressionList) }
            ])
            $.OPTION(() => $.CONSUME($.T.SemiColon))
          }
        },
        {
          ALT: () => {
            $.SUBRULE($.customPrelude, { LABEL: 'prelude' })
            $.OR3([
              { ALT: () => $.SUBRULE2($.curlyBlock) },
              { ALT: () => {
                $.OPTION2(() => $.CONSUME2($.T.SemiColon))
              }}
            ])
          }
        }
      ]
    })
  })
}