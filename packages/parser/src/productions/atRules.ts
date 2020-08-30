import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.atImport = $.OVERRIDE_RULE('atImport', () => {
    $.CONSUME($.T.AtImport)
    $._()
    $.OPTION(() => {
      $.CONSUME($.T.LParen)
      $._(1)
      $.CONSUME($.T.Ident)
      $._(2)
      $.MANY(() => {
        $.CONSUME($.T.Comma)
        $._(3)
        $.CONSUME2($.T.Ident)
        $._(4)
      })
      $.CONSUME($.T.RParen)
      $._(5)
    })
    $.OR([
      { ALT: () => $.CONSUME($.T.StringLiteral) },
      { ALT: () => $.CONSUME($.T.Uri) }
    ])
    $._(6)
    $.MANY_SEP({
      SEP: $.T.Comma,
      DEF: () => $.SUBRULE($.mediaQuery)
    })
    $.OPTION2(() => $.CONSUME($.T.SemiColon))
  })

  $.mediaFeature = $.OVERRIDE_RULE('mediaFeature', (afterAnd: boolean) => {
    $.OR([
      {
        GATE: () => !afterAnd,
        ALT: () => {
        $.CONSUME($.T.PlainIdent)
      }},
      { ALT: () => $.SUBRULE($.variable) },
      { 
        ALT: () => {
          $.CONSUME($.T.LParen)
          $.SUBRULE($.expression)
          $.CONSUME($.T.RParen)
        }
      }
    ])
    $._()
  })

  $.unknownAtRule = $.OVERRIDE_RULE('unknownAtRule', () => {
    $.CONSUME($.T.AtKeyword)
    const ws = $._()
    $.OR({
      /**
       * A prelude could have a colon too, so the last two rules are
       * ambiguous, but any unknown at-rule in the form of `@rule:`
       * is assumed to be a variable assignment
       */
      IGNORE_AMBIGUITIES: true,
      DEF: [
        {
          GATE: () => !ws,
          ALT: () => {
            /** Variable call */
            $.CONSUME($.T.LParen)
            $.CONSUME($.T.RParen)
          }
        },
        {
          ALT: () => {
            /** Variable assignment */
            $.CONSUME($.T.Colon)
            $._(1)
            $.OR2([
              { ALT: () => $.SUBRULE($.curlyBlock) },
              { ALT: () => {
                $.SUBRULE($.expressionList)
                $.OPTION(() => {
                  $.CONSUME($.T.Important)
                  $._(2)
                })
              }}
            ])
            $.OPTION2(() => $.CONSUME($.T.SemiColon))
          }
        },
        {
          ALT: () => {
            $.SUBRULE($.customPrelude, { LABEL: 'prelude' })
            $.OR3([
              { ALT: () => $.SUBRULE2($.curlyBlock) },
              { ALT: () => {
                $.OPTION3(() => $.CONSUME2($.T.SemiColon))
              }}
            ])
          }
        }
      ]
    })
  })
}