import type { CssParser } from '../cssParser'

export default function(this: CssParser, $: CssParser) {
  /** A comma-separated list of selectors */
  $.selectorList = $.RULE('selectorList', () => {
    $.SUBRULE($.complexSelector, { LABEL: 'selector' })
    $._(0, { LABEL: 'post' })
    $.MANY(() => {
      $.CONSUME($.T.Comma)
      $._(1, { LABEL: 'pre' })
      $.SUBRULE2($.complexSelector, { LABEL: 'selector' })
      $._(2, { LABEL: 'post' })
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
    $.SUBRULE($.compoundSelector, { LABEL: 'selector' })
    $.MANY(() => $.SUBRULE($.combinatorSelector, { LABEL: 'selector' }))
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
          $.CONSUME($.T.Combinator, { LABEL: 'combinator' })
          $.OPTION(() => $.CONSUME($.T.WS, { LABEL: 'combinator' }))
          $.SUBRULE2($.compoundSelector, { LABEL: 'selector' })
        }
      },
      {
        /**
         * Whitespace with optional combinator,
         * (or we treat as trailing ws)
         */
        ALT: () => {
          $.CONSUME2($.T.WS, { LABEL: 'combinator' })
          $.OPTION2(() => {
            $.OPTION3(() => {
              $.CONSUME2($.T.Combinator, { LABEL: 'combinator' })
              $.OPTION4(() => $.CONSUME3($.T.WS, { LABEL: 'combinator' }))
            })
            $.SUBRULE3($.compoundSelector, { LABEL: 'selector' })
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
      { ALT: () => $.CONSUME($.T.Star, { LABEL: 'selector' }) },
      {
        ALT: () => {
          $.AT_LEAST_ONE(() => $.SUBRULE($.simpleSelector, { LABEL: 'selector' }))
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
      { ALT: () => $.SUBRULE($.pseudoSelector, { LABEL: 'selector' }) },
      { ALT: () => $.SUBRULE($.attrSelector, { LABEL: 'selector' }) },
      { ALT: () => $.SUBRULE($.nameSelector, { LABEL: 'selector' }) },
      /** Used in keyframes as a selector */
      { ALT: () => $.CONSUME($.T.Unit, { LABEL: 'selector' }) }
    ])
  })

  /** e.g. :pseudo or ::pseudo */
  $.pseudoSelector = $.RULE('pseudoSelector', () => {
    $.CONSUME($.T.Colon, { LABEL: 'name' })
    $.OPTION(() => $.CONSUME2($.T.Colon, { LABEL: 'name' }))
    /** e.g. :pseudo(...) */
    $.OR2([
      {
        ALT: () => {
          $.CONSUME($.T.Ident, { LABEL: 'name' })
          /** Handle functions parsed as idents (like `not`) */
          $.OPTION2(() => {
            $.CONSUME($.T.LParen, { LABEL: 'name' })
            $.SUBRULE($.expressionListGroup, { LABEL: 'expression' })
            $.CONSUME($.T.RParen, { LABEL: 'R' })
          })
        }
      },
      {
        ALT: () => {
          $.CONSUME($.T.Function, { LABEL: 'name' })
          $.SUBRULE2($.expressionListGroup, { LABEL: 'expression' })
          $.CONSUME2($.T.RParen, { LABEL: 'R' })
        }
      }
    ])
  })

  /** e.g. [id^="bar"] [*|ns|="foo"] */
  $.attrSelector = $.RULE('attrSelector', () => {
    $.CONSUME($.T.LSquare, { LABEL: 'L' })
    $.OR([
      { ALT: () => {
        $.OPTION(() => $.CONSUME($.T.Star, { LABEL: 'attr' }))
        $.CONSUME($.T.Pipe, { LABEL: 'attr' })
        $.SUBRULE($.attrIdent, { LABEL: 'attr' })
      }},
      { ALT: () => {
        $.SUBRULE2($.attrIdent, { LABEL: 'attr' })
        $.OPTION2(() => {
          $.CONSUME2($.T.Pipe, { LABEL: 'attr' })
          $.SUBRULE3($.attrIdent, { LABEL: 'attr' })
        })
      }}
    ])
    $.OPTION4(() => {
      $.OR2([
        { ALT: () => $.CONSUME($.T.Eq, { LABEL: 'eq' }) },
        { ALT: () => $.CONSUME($.T.AttrMatch, { LABEL: 'eq' }) }
      ])
      $.OR3([
        {
          ALT: () => {
            $.SUBRULE4($.attrIdent, { LABEL: 'value' })
          }
        },
        {
          ALT: () => {
            $.CONSUME3($.T.Unit, { LABEL: 'value' })
          }
        },
        {
          ALT: () => {
            $.CONSUME($.T.StringLiteral, { LABEL: 'value' })
          }
        }
      ])
    })
    $.CONSUME($.T.RSquare, { LABEL: 'R' })
  })

  /** Separated out for Less overriding */
  $.attrIdent = $.RULE('attrIdent', () => $.CONSUME($.T.Ident, { LABEL: 'ident' }))
  $.nameSelector = $.RULE('nameSelector', () => $.CONSUME($.T.Selector, { LABEL: 'selector' }))
}