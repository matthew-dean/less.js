import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.atRule = $.OVERRIDE_RULE('atRule', () => {
    $.OR([
      { ALT: () => $.SUBRULE($.knownAtRule) },
      // {
      //   GATE: $.BACKTRACK($.testVariable),
      //   ALT: () => $.variable
      // },
      { ALT: () => $.SUBRULE($.unknownAtRule) }
    ])
  })

  $.testVariable = $.RULE('testVariable', () => {
    $.isVariableCall = false

    $.CONSUME($.T.AtKeyword)
    $.OR([
      { ALT: () => {
        // e.g. @var()
        $.CONSUME($.T.LParen)
        $.isVariableCall = true
      }},
      { ALT: () => {
        // e.g. @var[]()
        $.CONSUME($.T.LSquare)
        $.isVariableCall = true
      }},
      { ALT: () => {
        // e.g. @var: val
        $._()
        $.CONSUME($.T.Assign)
        $.isVariableCall = false
      }}
    ])
  })

  $.variable = $.RULE('variable', () => {
    const isCall = $.isVariableCall
    $.isVariableCall = false
    $.OR({
      IGNORE_AMBIGUITIES: true,
      DEF: [
        {
          GATE: () => isCall,
          ALT: () => $.SUBRULE($.variableCall)
        },
        { ALT: () => $.SUBRULE($.variableDeclaration) }
      ]
    })
  })

  $.variableCall = $.RULE('variableCall', () => {
    $.CONSUME($.T.AtKeyword)
    /** @todo - lookups */
    $.CONSUME($.T.LParen)
    $.CONSUME($.T.RParen)
  })

  $.variableDeclaration = $.RULE('variableDeclaration', (inArgs: boolean) => {
    $.CONSUME($.T.AtKeyword)
    $._()
    $.CONSUME($.T.Assign)
    $._(1)
    $.OR([
      { ALT: () => $.SUBRULE($.curlyBlock) },
      { ALT: () => $.SUBRULE($.expressionList) }
    ])
    $.OPTION({
      GATE: () => !inArgs,
      DEF: () => $.CONSUME($.T.SemiColon)
    })
  })
}