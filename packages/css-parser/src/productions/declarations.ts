import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /**
   * e.g.
   *   color: red
   */
  $.declaration = $.RULE('declaration', () => {
    $.SUBRULE($.property, { LABEL: 'name' })
    $._(0, { LABEL: 'postName' })
    $.CONSUME($.T.Assign, { LABEL: 'op' })
    $.SUBRULE($.expressionList, { LABEL: 'value' })
    $.OPTION(() => {
      $.CONSUME($.T.Important, { LABEL: 'important' })
      $._(1, { LABEL: 'postImportant' })
    })
    $.OPTION2(() => $.CONSUME($.T.SemiColon, { LABEL: 'semi' }))
  })

  /**
   * e.g.
   *   --color: { ;red }
   */
  $.customDeclaration = $.RULE('customDeclaration', () => {
    $.SUBRULE($.customProperty, { LABEL: 'name' })
    $._(0, { LABEL: 'postName' })
    $.CONSUME($.T.Assign, { LABEL: 'op' })
    $.SUBRULE($.customValue, { LABEL: 'value' })
    $.OPTION(() => $.CONSUME($.T.SemiColon, { LABEL: 'semi' }))
  })

  /** "color" in "color: red" */
  $.property = $.RULE('property', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.Ident, { LABEL: 'name' }) },
      {
        /** Legacy - remove? */
        ALT: () => {
          $.CONSUME($.T.Star, { LABEL: 'name' })
          $.CONSUME2($.T.Ident, { LABEL: 'name' })
        }
      }
    ])
  })
  $.customProperty = $.RULE('customProperty', () => $.CONSUME($.T.CustomProperty, { LABEL: 'name' }))
}