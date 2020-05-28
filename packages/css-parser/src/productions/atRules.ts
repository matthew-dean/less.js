import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {

  $.atRule = $.RULE('atRule', () => {
    $.OR([
      { ALT: () => $.SUBRULE($.knownAtRule) },
      { ALT: () => $.SUBRULE($.unknownAtRule) }
    ])
  })

  $.knownAtRule = $.RULE('knownAtRule', () => {
    $.OR([
      { ALT: () => $.SUBRULE($.atImport) },
      { ALT: () => $.SUBRULE($.atMedia) },
      { ALT: () => $.SUBRULE($.atSupports) }
    ])
  })

  $.atImport = $.RULE('atImport', () => {
    $.CONSUME($.T.AtImport)
    $._()
    $.OR([
      { ALT: () => $.CONSUME($.T.StringLiteral) },
      { ALT: () => $.CONSUME($.T.Uri) }
    ])
    $._(1)
    $.MANY_SEP({
      SEP: $.T.Comma,
      DEF: () => $.SUBRULE($.mediaQuery)
    })
  })

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media
   */
  $.atMedia = $.RULE('atMedia', () => {
    $.CONSUME($.T.AtMedia)
    $._()
    $.AT_LEAST_ONE_SEP({
      SEP: $.T.Comma,
      DEF: () => $.SUBRULE($.mediaQuery)
    })
  })

  $.atSupports = $.RULE('atSupports', () => {
    $.CONSUME($.T.AtSupports)
    $._()
    $.SUBRULE($.mediaCondition)
    $._(1)
    $.SUBRULE($.curlyBlock)
  })

  $.mediaQuery = $.RULE('mediaQuery', () => {
    $.OPTION(() => {
      $.CONSUME($.T.Only)
      $._()
    })
    $.SUBRULE($.mediaCondition)
    $._(1)
    $.SUBRULE($.curlyBlock)
  })

  $.mediaCondition = $.RULE('mediaCondition', () => {
    $.OR([
      {
        ALT: () => {
          $.CONSUME($.T.Not)
          $._()
          $.SUBRULE($.mediaFeature)
        }  
      },
      { ALT: () => $.SUBRULE2($.mediaAnd) }
    ])
  })

  $.mediaAnd = $.RULE('mediaAnd', () => {
    $.SUBRULE2($.mediaFeature)
    $._()
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.And) },
        { ALT: () => $.CONSUME($.T.Or) }
      ])
      $._(1)
      $.SUBRULE3($.mediaFeature)
    })
  })

  $.mediaFeature = $.RULE('mediaFeature', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.PlainIdent) },
      { 
        ALT: () => {
          $.CONSUME($.T.LParen)
          /**
           * This generically parses expressions that are nested.
           * Would normally be either a nested media condition
           * (`not (screen)`) OR an expression like:
           *  `(min-width: 640px)` or `(640px < width < 968px)`
           */
          $.SUBRULE($.expression)
          $.CONSUME($.T.RParen)
        }
      }
    ])
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  $.unknownAtRule = $.RULE('unknownAtRule', () => {
    $.CONSUME($.T.AtKeyword)
    $.SUBRULE($.customValue, { ARGS: [true], LABEL: 'prelude' })
    $.OR([
      { ALT: () => $.SUBRULE($.curlyBlock) },
      {
        ALT: () => $.OPTION(() => $.CONSUME($.T.SemiColon))
      }
    ])
  })
}