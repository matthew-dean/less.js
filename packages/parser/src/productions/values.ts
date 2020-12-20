import { LessParser } from '../lessParser'
import { EMPTY_ALT } from 'chevrotain'

export default function (this: LessParser, $: LessParser) {
  const compareGate = () => $.inCompareBlock

  /**
   * @todo - rewrite to capture all guard expressions
   */
  $.expression = $.OVERRIDE_RULE('expression', () => {
    $._(0, { LABEL: 'pre' })
    $.OR([
      {
        GATE: compareGate,
        ALT: () => $.MANY(() => $.SUBRULE($.compare, { LABEL: 'value' }))
      },
      { ALT: () => $.MANY2(() => $.SUBRULE($.addition, { LABEL: 'value' })) }
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
            $.OR3([{ ALT: () => $.CONSUME($.T.Comma) }, { ALT: () => $.CONSUME($.T.SemiColon) }])
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
      $.OR([{ ALT: () => $.CONSUME($.T.Comma) }, { ALT: () => $.CONSUME($.T.SemiColon) }])
      $._(1)
      $.SUBRULE2($.functionArg)
      $._(2)
    })
  })

  $.functionArg = $.RULE('functionArg', () => {
    $.OR([
      {
        ALT: () => {
          $.CONSUME($.T.AnonMixinStart)
          $.SUBRULE($.mixinArgs)
          $.CONSUME($.T.RParen)
          $._()
          $.SUBRULE($.curlyBlock)
        }
      },
      { ALT: () => $.SUBRULE2($.curlyBlock) },
      { ALT: () => $.SUBRULE($.expression) }
    ])
  })

  $.variable = $.RULE('variable', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.VarOrProp) },
      {
        ALT: () => {
          $.AT_LEAST_ONE(() => $.CONSUME($.T.Selector))
          /**
           * @note - if there are no parens or accessors, then
           *         it's a plain selector
           */
          $.OPTION(() => {
            $.CONSUME($.T.LParen)
            $.SUBRULE($.mixinArgs)
            $.CONSUME($.T.RParen)
          })
        }
      }
    ])
    $.MANY(() => {
      $.CONSUME($.T.LSquare)
      $.OR2([
        { ALT: () => $.CONSUME2($.T.VarOrProp) },
        { ALT: () => $.CONSUME($.T.Ident) },
        { ALT: () => EMPTY_ALT }
      ])
      $.CONSUME($.T.RSquare)
    })
  })

  $.valueBlock = $.RULE('valueBlock', () => {
    $.OR([
      {
        ALT: () => {
          $.OPTION(() => {
            /** Applying negative or positive to a value */
            $.CONSUME($.T.AdditionOperator, { LABEL: 'op' })
          })
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
      }
    ])
  })

  /** This is more specific than the CSS parser */
  $.value = $.OVERRIDE_RULE('value', () => {
    $.OPTION(() => {
      /** Applying negative or positive to a value */
      $.CONSUME($.T.AdditionOperator)
    })
    $.OR([
      { ALT: () => $.SUBRULE($.valueBlock) },
      { ALT: () => $.SUBRULE($.function) },
      { ALT: () => $.CONSUME($.T.Ident) },
      { ALT: () => $.SUBRULE($.variable) },
      { ALT: () => $.CONSUME($.T.CustomProperty) },
      { ALT: () => $.CONSUME($.T.Dimension) },
      { ALT: () => $.CONSUME($.T.Number) },
      { ALT: () => $.CONSUME($.T.Percent) },
      { ALT: () => $.CONSUME($.T.StringLiteral) },
      { ALT: () => $.CONSUME($.T.Uri) },
      { ALT: () => $.CONSUME($.T.ColorIntStart) },
      { ALT: () => $.CONSUME($.T.UnicodeRange) },
      { ALT: () => $.CONSUME($.T.When) },

      /** Can be found in selector expressions */
      { ALT: () => $.CONSUME($.T.AttrMatchOperator) },
      { ALT: () => $.CONSUME($.T.Colon) },
      { ALT: () => $.CONSUME($.T.Combinator) }
    ])
  })

  $.compare = $.RULE('compare', () => {
    const compareValue = $.inCompareBlock
    $.inCompareBlock = true
    $.SUBRULE($.addition, { LABEL: 'lhs' })
    $.MANY(() => $.SUBRULE($.compareRhs))
    /** Restore to value on entry */
    $.inCompareBlock = compareValue
  })

  $.compareRhs = $.RULE('compareRhs', () => {
    $.CONSUME($.T.CompareOperator, { LABEL: 'op' })
    $._(0, { LABEL: 'post' })
    $.SUBRULE($.addition, { LABEL: 'rhs' })
  })

  $.addition = $.RULE('addition', () => {
    $.SUBRULE($.multiplication, { LABEL: 'lhs' })
    $.MANY(() => $.SUBRULE($.additionRhs))
  })

  $.additionRhs = $.RULE('additionRhs', () => {
    $.CONSUME($.T.AdditionOperator, { LABEL: 'op' })
    $._(0, { LABEL: 'post' })
    $.SUBRULE($.multiplication, { LABEL: 'rhs' })
  })

  $.multiplication = $.RULE('multiplication', () => {
    $.SUBRULE($.value, { LABEL: 'lhs' })
    $._(0, { LABEL: 'pre' })
    $.MANY(() => $.SUBRULE($.multiplicationRhs))
  })

  $.multiplicationRhs = $.RULE('multiplicationRhs', () => {
    $.CONSUME($.T.MultiplicationOperator, { LABEL: 'op' })
    $._(1, { LABEL: 'post' })
    $.SUBRULE2($.value, { LABEL: 'rhs' })
    $._(2, { LABEL: 'pre' })
  })
}
