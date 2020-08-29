import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /** A comma-separated list of selectors */
  $.selectorList = $.RULE('selectorList', () => {
    $.SUBRULE($.complexSelector)
    $._()
    $.MANY(() => {
      $.CONSUME($.T.Comma)
      $._(1)
      $.SUBRULE2($.complexSelector)
      $._(2)
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
            {
              ALT: () => {
                $.CONSUME($.T.Ident)
                /** Handle functions parsed as idents (like `not`) */
                $.OPTION2(() => {
                  $.CONSUME($.T.LParen)
                  $.SUBRULE($.expressionListGroup)
                  $.CONSUME($.T.RParen)
                })
              }
            },
            /** e.g. :pseudo(...) */
            {
              ALT: () => {
                $.CONSUME($.T.Function)
                $.SUBRULE2($.expressionListGroup)
                $.CONSUME2($.T.RParen)
              }
            }
          ])
        }
      },
      {
        ALT: () => {
          $.SUBRULE($.attrSelector)
        }
      },
      {
        ALT: () => {
          $.SUBRULE($.nameSelector)
        }
      },
      {
        /** Used in keyframes as a selector */
        ALT: () => {
          $.CONSUME($.T.Unit)
        }
      }
    ])
  })

  /** e.g. [id^="bar"] [*|ns|="foo"] */
  $.attrSelector = $.RULE('attrSelector', () => {
    $.CONSUME($.T.LSquare)
    $.OR([
      { ALT: () => {
        $.OPTION(() => $.CONSUME($.T.Star))
        $.CONSUME($.T.Pipe)
        $.SUBRULE($.attrIdent)
      }},
      { ALT: () => {
        $.SUBRULE2($.attrIdent)
        $.OPTION2(() => {
          $.CONSUME2($.T.Pipe)
          $.SUBRULE3($.attrIdent)
        })
      }}
    ])
    $.OPTION4(() => {
      $.OR2([
        { ALT: () => $.CONSUME($.T.Eq) },
        { ALT: () => $.CONSUME($.T.AttrMatch) }
      ])
      $.OR3([
        {
          ALT: () => {
            $.SUBRULE4($.attrIdent)
          }
        },
        {
          ALT: () => {
            $.CONSUME3($.T.Unit)
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
  })

  /** Separated out for Less overriding */
  $.attrIdent = $.RULE('attrIdent', () => $.CONSUME($.T.Ident))
  $.nameSelector = $.RULE('nameSelector', () => $.CONSUME($.T.Selector))
}