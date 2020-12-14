import { IToken } from 'chevrotain'
import type { CssParser, CstNode } from '../cssParser'

export default function(this: CssParser, $: CssParser) {

  const makeAtRule = (
    atName: IToken,
    prelude: CstNode,
    blockOrTerminator?: (CstNode | IToken)
  ) => {
    const children = [atName, prelude]
    if (blockOrTerminator) {
      children.push(blockOrTerminator)
    }
    return {
      name: 'AtRule',
      children
    }
  }

  $.atRule = $.RULE('atRule', () => {
    return $.OR([
      { ALT: () => $.SUBRULE($.knownAtRule) },
      { ALT: () => $.SUBRULE($.unknownAtRule) }
    ])
  })

  $.knownAtRule = $.RULE('knownAtRule', () => {
    return $.OR([
      { ALT: () => $.SUBRULE($.atImport) },
      { ALT: () => $.SUBRULE($.atMedia) },
      { ALT: () => $.SUBRULE($.atSupports) },
      { ALT: () => $.SUBRULE($.atNested) },
      { ALT: () => $.SUBRULE($.atNonNested) }
    ])
  })

  $.atNested = $.RULE('atNested', () => {
    return makeAtRule(
      $.CONSUME($.T.AtNested),
      $.SUBRULE($.customPrelude),
      $.SUBRULE($.curlyBlock)
    )
  })

  $.atNonNested = $.RULE('atNonNested', () => {
    return makeAtRule(
      $.CONSUME($.T.AtNonNested),
      $.SUBRULE($.customPrelude),
      $.OPTION(() => $.CONSUME($.T.SemiColon))
    )
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
    $.OPTION(() => $.CONSUME($.T.SemiColon))
  })

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media
   */
  $.atMedia = $.RULE('atMedia', () => {
    $.CONSUME($.T.AtMedia)
    $._()
    $.SUBRULE($.mediaQuery)
    $._(1)
    $.MANY(() => {
      $.CONSUME($.T.Comma)
      $._(2)
      $.SUBRULE2($.mediaQuery)
      $._(3)
    })
    $.SUBRULE($.curlyBlock)
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
    $.SUBRULE($.mediaFeature)
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME($.T.And) },
        { ALT: () => $.CONSUME($.T.Or) }
      ])
      $._(1)
      $.SUBRULE2($.mediaFeature, { ARGS: [true] })
    })
  })

  $.mediaFeature = $.RULE('mediaFeature', (afterAnd: boolean) => {
    $.OR([
      {
        GATE: () => !afterAnd,
        ALT: () => {
        $.CONSUME($.T.PlainIdent)
      }},
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
    $._()
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  $.unknownAtRule = $.RULE('unknownAtRule', () => {
    $.CONSUME($.T.AtKeyword)
    $.SUBRULE($.customPrelude, { LABEL: 'prelude' })
    $.OR2([
      { ALT: () => $.SUBRULE($.curlyBlock) },
      {
        ALT: () => $.OPTION(() => $.CONSUME($.T.SemiColon))
      }
    ])
  })
}