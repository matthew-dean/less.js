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
    $.OPTION(() => {
      $.CONSUME($.T.Important)
      $._(1)
    })
    $.OPTION2(() => $.CONSUME($.T.SemiColon))
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
    $.OR([
      { ALT: () => $.CONSUME($.T.Ident) },
      {
        /** Legacy - remove? */
        ALT: () => {
          $.CONSUME($.T.Star)
          $.CONSUME2($.T.Ident)
        }
      }
    ])
  })
  $.customProperty = $.RULE('customProperty', () => $.CONSUME($.T.CustomProperty))
}