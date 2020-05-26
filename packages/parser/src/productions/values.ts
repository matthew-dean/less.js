import { LessParser } from '../lessParser'

export default function (this: LessParser, $: LessParser) {
  $.expression = $.OVERRIDE_RULE('expression', () => {
    $.MANY(() => $.SUBRULE($.addition))
  })

  /** This is more specific than the CSS parser */
  $.value = $.OVERRIDE_RULE('value', () =>
    $.OR([
      { ALT: () => $.SUBRULE($.block) },
      { ALT: () => $.CONSUME($.T.VarOrProp) },
      { ALT: () => $.CONSUME($.T.Unit) },
      { ALT: () => $.CONSUME($.T.Ident) },
      { ALT: () => $.CONSUME($.T.StringLiteral) },
      { ALT: () => $.CONSUME($.T.Uri) },
      { ALT: () => $.CONSUME($.T.Color) },
      { ALT: () => $.CONSUME($.T.UnicodeRange) },
      { ALT: () => $.CONSUME($.T.Colon) },
      { ALT: () => $.CONSUME($.T.WS) }
    ])
  )

  $.addition = $.RULE('addition', () => {
    $.SUBRULE($.multiplication, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.AdditionOperator)
      $._()
      $.SUBRULE2($.multiplication, { LABEL: 'rhs' })
    })
    $._(1)
  })

  const compareGate = () => $.inCompareBlock

  $.multiplication = $.RULE('multiplication', () => {
    $.SUBRULE($.compare, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.MultiplicationOperator)
      $._()
      $.SUBRULE2($.compare, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.compare = $.RULE('compare', () => {
    $.SUBRULE($.value, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.CompareOperator)
      $._()
      $.SUBRULE2($.value, { LABEL: 'rhs' })
    })
    $._(1)
  })
}
