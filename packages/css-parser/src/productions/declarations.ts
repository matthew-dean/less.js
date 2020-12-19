import type { CssParser, CstNode, IToken } from '../cssParser'

export interface Declaration extends CstNode {
  name: 'declaration'
  children: [
    name: IToken,
    ws: IToken,
    assign: IToken,
    value: CstNode,
    important: CstNode,
    semi: IToken
  ]
}

export default function(this: CssParser, $: CssParser) {
  /**
   * e.g.
   *   color: red
   */
  $.declaration = $.RULE('declaration',
    (): Declaration => ({
      name: 'declaration',
      children: [
        $.SUBRULE($.property),
        $._(0),
        $.CONSUME($.T.Assign),
        $.SUBRULE($.expressionList),
        $.OPTION(() => ({
          name: 'important',
          children: [
            $.CONSUME($.T.Important),
            $._(1)
          ]
        })),
        $.OPTION2(() => $.CONSUME($.T.SemiColon))
      ]
    })
  )

  /**
   * e.g.
   *   --color: { ;red }
   */
  $.customDeclaration = $.RULE('customDeclaration',
    (): Declaration => ({
      name: 'declaration',
      children: [
        $.SUBRULE($.customProperty),
        $._(0),
        $.CONSUME($.T.Assign),
        $.SUBRULE($.customValue),
        /** !important can be part of customValue */
        undefined,
        $.OPTION(() => $.CONSUME($.T.SemiColon))
      ]
    })
  )

  /** "color" in "color: red" */
  $.property = $.RULE('property',
    () => $.OR([
      { ALT: () => $.CONSUME($.T.Ident) },
      {
        /** Legacy - remove? */
        ALT: () => [
          $.CONSUME($.T.Star),
          $.CONSUME2($.T.Ident)
        ]
      }
    ])
  )

  $.customProperty = $.RULE('customProperty', () => $.CONSUME($.T.CustomProperty))
}