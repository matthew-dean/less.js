import { LessParser } from '../lessParser'
import { Rule } from 'chevrotain'

export default function (this: LessParser, $: LessParser) {
  const compareGate = () => $.inCompareBlock

  $.expression = $.OVERRIDE_RULE('expression', () => {
    $._()
    $.OR([
      {
        GATE: compareGate,
        ALT: () => $.MANY(() => $.SUBRULE($.compare))
      },
      { ALT: () => $.MANY2(() => $.SUBRULE($.addition)) }
    ])
  })

  /** @todo - allow semi-colon separators? */
  $.function = $.RULE('function', () => {
    $.CONSUME($.T.Function)
    $.SUBRULE($.expressionList)
    $.CONSUME($.T.RParen)
  })

  /** This is more specific than the CSS parser */
  $.value = $.OVERRIDE_RULE('value', () => {
    $.OR([
      /** Blocks */
      {
        ALT: () => {
          $.CONSUME($.T.LParen)
          $.SUBRULE($.expression)
          $.CONSUME($.T.RParen)
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.LSquare)
          $.SUBRULE2($.expression)
          $.CONSUME($.T.RSquare)
        }
      },
      { ALT: () => $.SUBRULE($.function) },
      { ALT: () => $.CONSUME($.T.VarOrProp) },
      { ALT: () => $.CONSUME($.T.CustomProperty) },
      { ALT: () => $.CONSUME($.T.Unit) },
      { ALT: () => $.CONSUME($.T.StringLiteral) },
      { ALT: () => $.CONSUME($.T.Uri) },
      { ALT: () => $.CONSUME($.T.ColorIntStart) },
      { ALT: () => $.CONSUME($.T.UnicodeRange) },

      /** Can be found in selector expressions */
      { ALT: () => $.CONSUME($.T.AttrMatchOperator) },
      { ALT: () => $.CONSUME($.T.Colon) },
      { ALT: () => $.CONSUME($.T.Selector) },
    ])
  })

  $.compare = $.RULE('compare', () => {
    $.SUBRULE($.addition, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.CompareOperator)
      $._()
      $.SUBRULE2($.addition, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.addition = $.RULE('addition', () => {
    $.SUBRULE($.multiplication, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.AdditionOperator)
      $._()
      $.SUBRULE2($.multiplication, { LABEL: 'rhs' })
    })
    $._(1)
  })

  $.multiplication = $.RULE('multiplication', () => {
    $.SUBRULE($.value, { LABEL: 'lhs' })
    $._()
    $.MANY(() => {
      $.CONSUME($.T.MultiplicationOperator)
      $._(1)
      $.SUBRULE2($.value, { LABEL: 'rhs' })
      $._(2)
    })
  })
}
