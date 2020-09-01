import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.selectorList = $.OVERRIDE_RULE('selectorList', () => {
    $.SUBRULE($.complexSelector)
    let allExtends = $.hasExtend
    $._(0, { LABEL: 'post' })
    $.OR([
      { ALT: () => $.SUBRULE($.guard) },
      {
        ALT: () => {
          $.MANY(() => {
            $.CONSUME($.T.Comma)
            $._(1, { LABEL: 'pre' })
            $.SUBRULE2($.complexSelector)
            allExtends = allExtends && $.hasExtend
            $._(2, { LABEL: 'post' })
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
        $.SUBRULE($.compoundSelector, { LABEL: 'selector' })
        $.MANY(() => $.SUBRULE($.combinatorSelector, { LABEL: 'selector' }))
      }},
      { ALT: () => $.AT_LEAST_ONE(() => $.SUBRULE2($.combinatorSelector, { LABEL: 'selector' }))}
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