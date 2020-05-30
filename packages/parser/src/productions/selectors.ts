import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.complexSelector = $.OVERRIDE_RULE('complexSelector', () => {
    $._()
    $.OR([
      { ALT: () => {
        $.SUBRULE($.compoundSelector, { LABEL: 'Selector' })
        $.MANY(() => $.SUBRULE($.combinatorSelector))
      }},
      { ALT: () => $.AT_LEAST_ONE(() => $.SUBRULE2($.combinatorSelector))}
    ])
  })  
}