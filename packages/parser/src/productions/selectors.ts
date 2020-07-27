import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.selectorList = $.OVERRIDE_RULE('selectorList', () => {
    $.SUBRULE($.complexSelector)
    let allExtends = $.hasExtend
    $._()
    $.OR([
      { ALT: () => $.SUBRULE($.guard) },
      {
        ALT: () => {
          $.MANY(() => {
            $.CONSUME($.T.Comma)
            $._(1)
            $.SUBRULE2($.complexSelector)
            allExtends = allExtends && $.hasExtend
            $._(2)
          })
        }
      }
    ])
    /** Determines here if can omit a curly block */
    $.hasExtend = allExtends
  })
  
  $.complexSelector = $.OVERRIDE_RULE('complexSelector', () => {
    $.OR([
      { ALT: () => {
        $.SUBRULE($.compoundSelector, { LABEL: 'Selector' })
        $.MANY(() => $.SUBRULE($.combinatorSelector))
      }},
      { ALT: () => $.AT_LEAST_ONE(() => $.SUBRULE2($.combinatorSelector))}
    ])
    $.OPTION(() => {
      $.CONSUME($.T.Extend)
      $.hasExtend = true
      $.SUBRULE($.expressionListGroup, { LABEL: 'blockBody' })
      $.CONSUME($.T.RParen, { LABEL: 'R' })
    })
    $._(1)
  })

  $.attrIdent = $.OVERRIDE_RULE('attrIdent', () => $.SUBRULE($.identOrInterpolated))
}