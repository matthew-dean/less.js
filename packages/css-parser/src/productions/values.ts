import type { CssParser } from '../cssParser'
import { EMPTY_ALT } from 'chevrotain'

export default function(this: CssParser, $: CssParser) {
  /**
   * A custom property's (or unknown at-rule's) outer value
   */
  $.customValue = $.RULE('customValue', (inAtRule: boolean) => {
    $.MANY(
      () => $.OR([
        { ALT: () => $.SUBRULE($.anyToken, { LABEL: 'value' }) },
        { ALT: () => $.SUBRULE($.extraTokens, { LABEL: 'value' }) },
        { ALT: () => $.SUBRULE($.customBlock, { ARGS: [inAtRule], LABEL: 'value' }) }
      ])
    )
  })

  /** 
   * A custom value within a block 
   */
  $.customValueOrSemi = $.RULE('customValueOrSemi', (inAtRule: boolean) => {
    $.MANY(
      () => $.OR([
        { ALT: () => $.CONSUME($.T.SemiColon, { LABEL: 'value' }) },
        { ALT: () => $.SUBRULE($.anyToken, { LABEL: 'value' }) },
        { ALT: () => $.SUBRULE($.extraTokens, { LABEL: 'value' }) },
        { ALT: () => $.SUBRULE($.customBlock, { ARGS: [inAtRule], LABEL: 'value' }) }
      ])
    )
  })

  /**
   * List of expression lists (or expression list if only 1),
   * separated by semi-colon. This handles / formats arbitrary
   * semi-colons or separating semi-colons in declaration lists
   * within parentheses or brackets.
   */
  $.expressionListGroup = $.RULE('expressionListGroup', () => {
    $.AT_LEAST_ONE(() => {
      $.SUBRULE($.expressionList)
      $.OPTION(() => $.CONSUME($.T.SemiColon))
    })
  })

  $.expressionList = $.RULE('expressionList', () => {
    $.MANY_SEP({
      SEP: $.T.Comma,
      DEF: () => $.SUBRULE($.expression)
    })
  })

  /**
   *  An expression contains values and spaces
   */
  $.expression = $.RULE('expression', () => {
    $.MANY(() => $.SUBRULE($.value))
  })

  /**
   * According to a reading of the spec, whitespace is a valid
   * value in a CSS list, e.g. in the custom properties spec,
   * `--custom: ;` has a value of ' '
   *
   * However, a property's grammar may discard whitespace between values.
   * e.g. for `color: black`, the value in the browser will resolve to `black`
   * and not ` black`. The CSS spec is rather hand-wavy about whitespace,
   * sometimes mentioning it specifically, sometimes not representing it
   * in grammar even though it's expected to be present.
   *
   * Strictly speaking, though, a property's value begins _immediately_
   * following a ':' and ends at ';' (or until automatically closed by
   * '}', ']', ')' or the end of a file).
   */
  $.value = $.RULE('value', () =>
    $.OR([{ ALT: () => $.SUBRULE($.block) }, { ALT: () => $.SUBRULE($.anyToken) }])
  )

  $.anyToken = $.RULE('anyToken', () =>
    $.OR([
      { ALT: () => $.CONSUME($.T.Value) },
      /** Can be in a var() function */
      { ALT: () => $.CONSUME($.T.CustomProperty) },
      { ALT: () => $.CONSUME($.T.Colon) },
      { ALT: () => $.CONSUME($.T.WS) }
    ])
  )

  /**
   * Extra tokens in a custom property. Should include any
   * and every token possible, including unknown tokens.
   */
  $.extraTokens = $.RULE('extraTokens', () =>
    $.OR([
      { ALT: () => $.CONSUME($.T.AtName) },
      { ALT: () => $.CONSUME($.T.Comma) }
    ])
  )
}