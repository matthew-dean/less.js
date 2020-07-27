import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.identOrInterpolated = $.RULE('identOrInterpolated', () => {
    $.AT_LEAST_ONE(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.Ident) },
        { ALT: () => $.CONSUME($.T.InterpolatedIdent) }
      ])
    })
  })
}