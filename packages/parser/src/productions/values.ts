import { LessParser } from '../lessParser'

export default function (this: LessParser, $: LessParser) {
  const compareGate = () => $.inCompareBlock

  /**
   * @todo - rewrite to capture all guard expressions
   */
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

  $.function = $.RULE('function', () => {
    $.OR([
      {
        ALT: () => {
          $.OR2([
            { ALT: () => $.CONSUME($.T.PlainFunction) },
            { ALT: () => $.CONSUME($.T.FormatFunction) }
          ])
          $.SUBRULE($.functionArgs)
          $.CONSUME($.T.RParen)
        }
      },
      /**
       * Special parsing of `if` and `boolean`
       */
      {
        ALT: () => {
          $.CONSUME($.T.BooleanFunction)
          $.SUBRULE($.guardOr, { ARGS: [true] })
          $.CONSUME2($.T.RParen)
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.IfFunction)
          $.SUBRULE2($.guardOr, { ARGS: [true] })
          $._()
          $.MANY(() => {
            $.OR3([
              { ALT: () => $.CONSUME($.T.Comma) },
              { ALT: () => $.CONSUME($.T.SemiColon) }
            ])
            $._(1)
            $.SUBRULE2($.functionArg)
            $._(2)
          })
          $.CONSUME3($.T.RParen)
        }
      }
    ])
  })

  $.functionArgs = $.RULE('functionArgs', () => {
    $.SUBRULE($.functionArg)
    $._()
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.Comma) },
        { ALT: () => $.CONSUME($.T.SemiColon) }
      ])
      $._(1)
      $.SUBRULE2($.functionArg)
      $._(2)
    })
  })

  $.functionArg = $.RULE('functionArg', () => {
    $.OR([
      {
        GATE: $.BACKTRACK($.testAnonMixin),
        ALT: () => {
          const semiColonSeparated = $.isSemiColonSeparated
          $.CONSUME($.T.AnonMixinStart)
          $.SUBRULE($.mixinCallArgs, { ARGS: [semiColonSeparated] })
          $.CONSUME($.T.RParen, { LABEL: 'R' })
          $.isSemiColonSeparated = semiColonSeparated
          $._()
          $.SUBRULE($.curlyBlock)
        }
      },
      { ALT: () => $.SUBRULE2($.curlyBlock) },
      { ALT: () => $.SUBRULE($.expression) }
    ])
  })

  /** This is more specific than the CSS parser */
  $.value = $.OVERRIDE_RULE('value', () => {
    $.OPTION(() => {
      $.CONSUME($.T.AdditionOperator)
    })
    $.OR([
      /** Blocks */
      {
        ALT: () => {
          $.CONSUME($.T.LParen)
          $.OR2([
            {
              GATE: compareGate,
              ALT: () => $.SUBRULE($.guardOr)
            },
            { ALT: () => $.SUBRULE($.expressionList) }
          ])
          $.CONSUME($.T.RParen)
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.LSquare)
          $.SUBRULE2($.expressionList)
          $.CONSUME($.T.RSquare)
        }
      },
      { ALT: () => $.SUBRULE($.function) },
      { ALT: () => $.CONSUME($.T.Ident) },
      { ALT: () => $.CONSUME($.T.VarOrProp) },
      { ALT: () => $.CONSUME($.T.CustomProperty) },
      { ALT: () => $.CONSUME($.T.Unit) },
      { ALT: () => $.CONSUME($.T.Percent) },
      { ALT: () => $.CONSUME($.T.StringLiteral) },
      { ALT: () => $.CONSUME($.T.Uri) },
      { ALT: () => $.CONSUME($.T.ColorIntStart) },
      { ALT: () => $.CONSUME($.T.UnicodeRange) },

      /** Can be found in selector expressions */
      { ALT: () => $.CONSUME($.T.AttrMatchOperator) },
      { ALT: () => $.CONSUME($.T.Colon) },
      { ALT: () => $.CONSUME($.T.Selector) },
      { ALT: () => $.CONSUME($.T.Combinator) }
    ])
  })

  $.compare = $.RULE('compare', () => {
    const compareValue = $.inCompareBlock
    $.inCompareBlock = true
    $.SUBRULE($.addition, { LABEL: 'lhs' })
    $.MANY(() => {
      $.CONSUME($.T.CompareOperator)
      $._()
      $.SUBRULE2($.addition, { LABEL: 'rhs' })
    })
    /** Restore to value on entry */
    $.inCompareBlock = compareValue
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
