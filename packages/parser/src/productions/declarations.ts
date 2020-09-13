import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  /** "color" in "color: red" */
  $.property = $.OVERRIDE_RULE('property', () => {
    /** Legacy - remove? */
    $.OPTION(() => $.CONSUME($.T.Star, { LABEL: 'name' }))
    
    $.OR([
      { ALT: () => {
        $.AT_LEAST_ONE(() => $.OR2([
          { ALT: () => $.CONSUME($.T.Ident, { LABEL: 'name' }) },
          { ALT: () => $.CONSUME($.T.InterpolatedIdent, { LABEL: 'name' }) },
          /** Isolated dashes */
          { ALT: () => $.CONSUME($.T.Minus, { LABEL: 'name' }) }
        ]))
      }}
    ])
    
  })
  
  $.customProperty = $.OVERRIDE_RULE('customProperty', () => {
    $.CONSUME($.T.CustomProperty, { LABEL: 'name' })
    $.MANY(() => $.OR([
      { ALT: () => $.CONSUME($.T.Ident, { LABEL: 'name' }) },
      { ALT: () => $.CONSUME($.T.InterpolatedIdent, { LABEL: 'name' }) },
      /** Isolated dashes */
      { ALT: () => $.CONSUME($.T.Minus, { LABEL: 'name' }) }
    ]))
  })

}