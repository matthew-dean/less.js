import { EMPTY_ALT, ConsumeMethodOpts, IToken } from 'chevrotain'
import type { CssParser, CstNode } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
   /** Optional whitespace */
   $._ = function(idx: number = 0, options?: ConsumeMethodOpts) {
    // +10 to avoid conflicts with other OPTION in the calling rule.
    return $.option(idx + 10, () => $.consume(idx + 10, $.T.WS, options))
  }

  /** Stylesheet */
  $.root = $.RULE<CstNode>('root', () => {
    return {
      name: 'root',
      children: $.SUBRULE($.primary)
    }
  })

  /** List of rules */
  $.primary = $.RULE<(IToken | CstNode)[]>('primary', () => {
    const rules = []
    $.MANY(() => rules.push($.SUBRULE($.rule)))
    
    const ws = $._()
    if (ws) {
      rules.push(ws)
    }
    
    return rules
  })

  $.rule = $.RULE<CstNode>('rule', () => {
    const pre = $._()
    const rule = $.OR([
      { ALT: () => $.SUBRULE($.atRule) },
      { ALT: () => $.SUBRULE($.customDeclaration) },
      {
        GATE: $.BACKTRACK($.testQualifiedRule),
        ALT: () => $.SUBRULE($.qualifiedRule)
      },
      { ALT: () => $.SUBRULE($.declaration) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => $.CONSUME($.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
    if (pre) {
      if (rule !== EMPTY_ALT) {
        // rule.pre = pre
      } else {
        return pre
      }
    }
    return rule
  })
}