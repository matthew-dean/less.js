import { EMPTY_ALT } from 'chevrotain'
import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
   /** Optional whitespace */
   $._ = function(idx: number = 0) {
    // +10 to avoid conflicts with other OPTION in the calling rule.
    return $.option(idx + 10, () => $.consume(idx + 10, $.T.WS))
  }

  $.primary = $.RULE('primary', () => {
    $.MANY(() => $.SUBRULE($.rule))
    $._()
  })

  $.rule = $.RULE('rule', () => {
    $._()
    $.OR([
      { ALT: () => $.SUBRULE($.atRule) },
      { ALT: () => $.SUBRULE($.customDeclaration) },
      {
        GATE: $.BACKTRACK($.testQualifiedRule),
        ALT: () => $.SUBRULE($.qualifiedRule)
      },
      { ALT: () => $.SUBRULE2($.declaration) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => $.CONSUME($.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
  })
}