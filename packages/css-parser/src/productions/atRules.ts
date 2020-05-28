import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  $.atRule = $.RULE('atRule', () => {
    $.CONSUME($.T.AtName)
    $.SUBRULE($.customValue, { ARGS: [true] })

    $.OR([
      { ALT: () => $.SUBRULE($.curlyBlock) },
      {
        ALT: () => $.OPTION(() => $.CONSUME($.T.SemiColon))
      }
    ])
  })
}