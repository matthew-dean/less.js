import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.selectorList = $.OVERRIDE_RULE('selectorList', () => {
    $.SUBRULE($.complexSelector, { LABEL: 'selector'})
    let allExtends = $.hasExtend
    $._(0, { LABEL: 'post' })
    $.OR([
      { ALT: () => $.SUBRULE($.guard) },
      {
        ALT: () => {
          $.MANY(() => {
            $.CONSUME($.T.Comma)
            $._(1, { LABEL: 'pre' })
            $.SUBRULE2($.complexSelector, { LABEL: 'selector'})
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
      $.SUBRULE($.selectorList, { LABEL: 'args' })
      $.CONSUME($.T.RParen, { LABEL: 'R' })
    })
    $._(1)
  })

  $.simpleSelector = $.OVERRIDE_RULE('simpleSelector',
    () => $.OR([
      { ALT: () => $.SUBRULE($.pseudoSelector) },
      { ALT: () => $.SUBRULE($.attrSelector) },
      { ALT: () => $.SUBRULE($.nameSelector) },
      /** Used in keyframes as a selector */
      { ALT: () => $.CONSUME($.T.Dimension) },
      /** Can be a partial class, as in `&-1` */
      { ALT: () => $.CONSUME($.T.Number) }
    ])
  )

  $.attrIdent = $.OVERRIDE_RULE('attrIdent', () => $.SUBRULE($.identOrInterpolated))
}