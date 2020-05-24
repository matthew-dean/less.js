import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.interpolate = $.RULE('interpolate', () => {
    $.CONSUME($.T.InterpolatedStart), $.CONSUME($.T.Ident), $.CONSUME($.T.RCurly)
  })
}