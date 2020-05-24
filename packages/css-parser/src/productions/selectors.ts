import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /** A comma-separated list of selectors */
  $.selectorList = $.RULE('selectorList', () => {
    $.MANY_SEP({
      SEP: $.T.Comma,
      DEF: () => $.SUBRULE($.complexSelector)
    })
  })

  /**
   * "A complex selector is a sequence of one or more compound selectors
   *  separated by combinators. It represents a set of simultaneous
   *  conditions on a set of elements in the particular relationships
   *  described by its combinators."
   *
   * For simplicity, this is returned as a stream of selectors
   * and combinators.
   *
   * @see https://www.w3.org/TR/selectors-4/#structure
   */
  $.complexSelector = $.RULE('complexSelector', () => {
    $._()
    $.SUBRULE($.compoundSelector, { LABEL: 'Selector' })
    $.MANY(() => $.SUBRULE($.combinatorSelector))
  })

  /**
   * A combinator, then a compound selector
   *  e.g. `> div.class`
   */
  $.combinatorSelector = $.RULE('combinatorSelector', () => {
    $.OR([
      {
        ALT: () => {
          /**
           * Combinator with optional whitespace
           */
          $.CONSUME($.T.Combinator, { LABEL: 'Selector' })
          $.OPTION(() => $.CONSUME($.T.WS, { LABEL: 'Selector' }))
          $.SUBRULE2($.compoundSelector, { LABEL: 'Selector' })
        }
      },
      {
        /**
         * Whitespace with optional combinator,
         * (or we treat as trailing ws)
         */
        ALT: () => {
          $.CONSUME2($.T.WS, { LABEL: 'Selector' })
          $.OPTION2(() => {
            $.OPTION3(() => {
              $.CONSUME2($.T.Combinator, { LABEL: 'Selector' })
              $.OPTION4(() => $.CONSUME3($.T.WS, { LABEL: 'Selector' }))
            })
            $.SUBRULE3($.compoundSelector, { LABEL: 'Selector' })
          })
        }
      }
    ])
  })

  /**
   * "A compound selector is a sequence of simple selectors that are not separated by a combinator,
   * and represents a set of simultaneous conditions on a single element. If it contains a type
   * selector or universal selector, that selector must come first in the sequence."
   *
   * @see https://www.w3.org/TR/selectors-4/#structure
   */
  $.compoundSelector = $.RULE('compoundSelector', () => {
    $.OR([
      { ALT: () => $.CONSUME($.T.Star) },
      {
        ALT: () => {
          $.AT_LEAST_ONE(() => $.SUBRULE($.simpleSelector))
        }
      }
    ])
  })

  /**
   * "A simple selector is a single condition on an element. A type selector,
   * universal selector, attribute selector, class selector, ID selector,
   * or pseudo-class is a simple selector."
   *
   * @see https://www.w3.org/TR/selectors-4/#structure
   */
  $.simpleSelector = $.RULE('simpleSelector', () => {
    $.OR([
      {
        /** e.g. :pseudo or ::pseudo */
        ALT: () => {
          $.CONSUME($.T.Colon, { LABEL: 'Selector' })
          $.OPTION(() => $.CONSUME2($.T.Colon))
          $.OR2([
            { ALT: () => $.CONSUME($.T.Ident) },
            /** e.g. :pseudo(...) */
            {
              ALT: () => {
                $.CONSUME($.T.Function)
                $.SUBRULE($.expressionListGroup)
                $.CONSUME($.T.RParen)
              }
            }
          ])
        }
      },
      {
        /** e.g. [id^="bar"] */
        ALT: () => {
          $.CONSUME($.T.LSquare)
          $.CONSUME2($.T.Ident)
          $.OPTION2(() => {
            $.OR3([
              { ALT: () => $.CONSUME($.T.Eq) },
              { ALT: () => $.CONSUME($.T.AttrMatch) }
            ])
            $.OR4([
              {
                ALT: () => {
                  $.CONSUME3($.T.Ident)
                }
              },
              {
                ALT: () => {
                  $.CONSUME($.T.StringLiteral)
                }
              }
            ])
          })
          $.CONSUME($.T.RSquare)
        }
      },
      {
        ALT: () => {
          $.SUBRULE($.nameSelector)
        }
      }
    ])
  })

  $.nameSelector = $.RULE('nameSelector', () => $.CONSUME($.T.Selector))
}