import type { CssParser } from '../cssParser'
import { MismatchedTokenException } from 'chevrotain'

export default function(this: CssParser, $: CssParser) {
  /**
   * e.g.
   *   color: red
   */
  $.declaration = $.RULE('declaration', () => {
    $.SUBRULE($.property)
    $._()
    $.CONSUME($.T.Assign)
    $.SUBRULE($.expressionList)
    $.OPTION(() => $.CONSUME($.T.SemiColon))
  })

  /**
   * e.g.
   *   --color: { ;red }
   */
  $.customDeclaration = $.RULE('customDeclaration', () => {
    $.SUBRULE($.customProperty)
    $._()
    $.CONSUME($.T.Assign)
    $.SUBRULE($.customValue)
    $.OPTION(() => $.CONSUME($.T.SemiColon))
  })

  /** "color" in "color: red" */
  $.property = $.RULE('property', () => {
    $.AT_LEAST_ONE(() => $.OR({
      IGNORE_AMBIGUITIES: true,
      DEF: [
        {
          ALT: () => $.CONSUME($.T.Ident)
        },
        /** Legacy: remove? */
        {
          ALT: () => $.CONSUME($.T.Star)
        },
        {
          ALT: () => {
            $.CONSUME($.T.Value)
            $.saveError(MismatchedTokenException, 'Invalid property name')
          }
        }
      ]
    }))
  })
  $.customProperty = $.RULE('customProperty', () => $.CONSUME($.T.CustomProperty))
}