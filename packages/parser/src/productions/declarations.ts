import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  /** "color" in "color: red" */
  $.property = $.OVERRIDE_RULE('property', () => {
    /** Legacy - remove? */
    $.OPTION(() => $.CONSUME($.T.Star))
    
    $.OR([
      { ALT: () => {
        $.AT_LEAST_ONE(() => $.OR2([
          { ALT: () => $.CONSUME($.T.Ident) },
          { ALT: () => $.CONSUME($.T.InterpolatedIdent) },
          /** Isolated dashes */
          { ALT: () => $.CONSUME($.T.Minus) }
        ]))
      }}
    ])
    
  })
  
  $.customProperty = $.OVERRIDE_RULE('customProperty', () => {
    $.CONSUME($.T.CustomProperty)
    $.MANY(() => $.OR([
      { ALT: () => $.CONSUME($.T.Ident) },
      { ALT: () => $.CONSUME($.T.InterpolatedIdent) },
      /** Isolated dashes */
      { ALT: () => $.CONSUME($.T.Minus) }
    ]))
  })

}