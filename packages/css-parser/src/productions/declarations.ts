import type { CssParser } from '../cssParser'

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
  $.property = $.RULE('property', () => $.CONSUME($.T.Ident))
  $.customProperty = $.RULE('customProperty', () => $.CONSUME($.T.CustomProperty))
}