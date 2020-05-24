import {
  EMPTY_ALT,
  TokenType,
  CstNode,
  CstElement,
  CstParser,
  IParserConfig,
  IToken
} from 'chevrotain'
import { TokenMap } from '../util'

/**
 *  A Note About CSS Syntax
 *
 *  CSS, as far as syntax is defined in https://www.w3.org/TR/css-syntax-3/,
 *  is somewhat confusing the first 50 times you read it, probably because
 *  it contains some ambiguities and inherent self-contradictions due to
 *  it's legacy nature. It also has no specific "spec" to draw from.
 *
 *  CSS essentially is not one spec of syntax and grammar, but is, in fact,
 *  a collection of specs of syntax and grammar, some of which can mean that
 *  parsing rules are potentially contradictory.
 *
 *  For example, if you were to just parse: `foo:bar {}`, if you just went by
 *  the syntax spec alone, there's no way to resolve this. Property values
 *  (according to spec), may have `{}` as a value, and pseudo-selectors may start
 *  with a colon. So this may be a property of `foo` with a value of `bar {}`
 *  or it may be the selector `foo:bar` with a set of rules in `{}`.
 *
 *  CSS resolves syntactic ambiguity by specifying that blocks should have different
 *  parsing strategies based on context. Blocks can either parse a list of rules,
 *  or can parse a list of declarations (at-rules are considered declarations),
 *  but not both.
 *
 *  Here's the rub: blocks are generic, can be wrapped in `()`, `[]`, or `{}`,
 *  and which type they consume is not defined globally; it's defined by that
 *  particular declaration's own grammar. In addition, if one assumes that `{}`
 *  is always a list of declarations, that's not the case. Custom properties
 *  can contain curly blocks that contain anything.
 *
 *  Making a context-switching CSS parser is possible, but not useful, both for
 *  custom properties that define a rule-like block, and for generalizing
 *  parsing for pre-processors like Less. Unfortunately, any pre-processor with
 *  nested syntax is inherently ambiguous for the above reasons, meaning any
 *  pre-processor like Less, Sass, or PostCSS, using nested syntax, can never be
 *  a 100% spec-compliant CSS parser.
 *
 *  However, in this CSS parser and parsers that extend it, we can intelligently
 *  resolve ambiguities with these principles:
 *    1. There are no element selectors that start with '--'
 *    2. There are no currently-defined CSS properties that have a {} block as a
 *       possible value. (If this ever happens, CSS parsing libraries are screwed.)
 *
 *  CSS grammar is extremely permissive to allow modularity of the syntax and
 *  future expansion. Basically, anything "unknown", including unknown tokens,
 *  does not necessarily mean a parsing error of the stylesheet itself. For
 *  example, the contents of an at-rule body (defined in a "{}") has no explicit
 *  definition, but is instead left up to the spec for that particular at rule.
 *  That means you could end up with some future at-rule like:
 *     `@future {!!:foo > ; > ?bar}`
 *  A case like that is _unlikely_, but the point is any CSS parser that lives
 *  outside of the browser, in order to be maintainable, must parse what it
 *  _can_, but preserve almost anything it doesn't explicitly define. (There are
 *  a few exceptions, such as a closing block symbol e.g. ']' without a corresponding
 *  opening block, and other such cases where the CSS spec explicitly expresses
 *  should be a parse error.)
 */

interface spaceToken {
  pre?: IToken[]
  post?: IToken[]
}

/**
 *  Parsing is broken into 2 phases, so that we:
 *    1. Don't have to do any backtracking to refine rules (like @media).
 *    2. Don't have to have special parsing rules based on block context.
 *
 *  This actually matches the spec, which essentially says that preludes and
 *  at-rule bodies (in {}) can be almost anything, and the outer grammar should
 *  not care about what at-rules or declaration values contain.
 */
export class CssParser extends CstParser {
  T: TokenMap

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = {
      maxLookahead: 1
      /* , traceInitPerf:2 */
    }
  ) {
    super(tokens, config)
    this.T = T
    /** If this is extended, don't perform self-analysis twice */
    if (this.constructor === CssParser) {
      this.performSelfAnalysis()
    }
  }

  /** Optional whitespace */
  _(idx: number = 0) {
    // +10 to avoid conflicts with other OPTION in the calling rule.
    return this.option(idx + 10, () => this.consume(idx + 10, this.T.WS))
  }

  primary = this.RULE('primary', () => {
    this.MANY(() => this.SUBRULE(this.rule))
    this._()
  })

  rule = this.RULE('rule', () => {
    this._()
    this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.customDeclaration) },
      {
        GATE: this.BACKTRACK(this.testQualifiedRule),
        ALT: () => this.SUBRULE(this.qualifiedRule)
      },
      { ALT: () => this.SUBRULE2(this.declaration) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => this.CONSUME(this.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  atRule = this.RULE('atRule', () => {
    this.CONSUME(this.T.AtName)
    this.SUBRULE(this.expressionList)

    this.OR([
      { ALT: () => this.SUBRULE(this.curlyBlock) },
      {
        ALT: () => this.OPTION(() => this.CONSUME(this.T.SemiColon))
      }
    ])
  })

  /**
   *
   */
  qualifiedRule = this.RULE('qualifiedRule', () => {
    this.SUBRULE(this.selectorList)
    this.SUBRULE(this.curlyBlock)
  })

  /**
   * Test for qualified rule start
   */
  testQualifiedRule = this.RULE('testQualifiedRule', () => {
    this.SUBRULE(this.selectorList)
    this.CONSUME(this.T.LCurly)
  })

  /** A comma-separated list of selectors */
  selectorList = this.RULE('selectorList', () => {
    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => this.SUBRULE(this.complexSelector)
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
  complexSelector = this.RULE('complexSelector', () => {
    this._()
    this.SUBRULE(this.compoundSelector, { LABEL: 'Selector' })
    this.MANY(() => this.SUBRULE(this.combinatorSelector))
  })

  /**
   * A combinator, then a compound selector
   *  e.g. `> div.class`
   */
  combinatorSelector = this.RULE('combinatorSelector', () => {
    this.OR([
      {
        ALT: () => {
          /**
           * Combinator with optional whitespace
           */
          this.CONSUME(this.T.Combinator, { LABEL: 'Selector' })
          this.OPTION(() => this.CONSUME(this.T.WS, { LABEL: 'Selector' }))
          this.SUBRULE2(this.compoundSelector, { LABEL: 'Selector' })
        }
      },
      {
        /**
         * Whitespace with optional combinator,
         * (or we treat as trailing ws)
         */
        ALT: () => {
          this.CONSUME2(this.T.WS, { LABEL: 'Selector' })
          this.OPTION2(() => {
            this.OPTION3(() => {
              this.CONSUME2(this.T.Combinator, { LABEL: 'Selector' })
              this.OPTION4(() => this.CONSUME3(this.T.WS, { LABEL: 'Selector' }))
            })
            this.SUBRULE3(this.compoundSelector, { LABEL: 'Selector' })
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
  compoundSelector = this.RULE('compoundSelector', () => {
    this.OR([
      { ALT: () => this.CONSUME(this.T.Star) },
      {
        ALT: () => {
          this.AT_LEAST_ONE(() => this.SUBRULE(this.simpleSelector))
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
  simpleSelector = this.RULE('simpleSelector', () => {
    this.OR([
      {
        /** e.g. :pseudo or ::pseudo */
        ALT: () => {
          this.CONSUME(this.T.Colon, { LABEL: 'Selector' })
          this.OPTION(() => this.CONSUME2(this.T.Colon))
          this.OR2([
            { ALT: () => this.CONSUME(this.T.Ident) },
            /** e.g. :pseudo(...) */
            {
              ALT: () => {
                this.CONSUME(this.T.Function)
                this.SUBRULE(this.expressionListGroup)
                this.CONSUME(this.T.RParen)
              }
            }
          ])
        }
      },
      {
        /** e.g. [id^="bar"] */
        ALT: () => {
          this.CONSUME(this.T.LSquare)
          this.CONSUME2(this.T.Ident)
          this.OPTION2(() => {
            this.OR3([
              { ALT: () => this.CONSUME(this.T.Eq) },
              { ALT: () => this.CONSUME(this.T.AttrMatch) }
            ])
            this.OR4([
              {
                ALT: () => {
                  this.CONSUME3(this.T.Ident)
                }
              },
              {
                ALT: () => {
                  this.CONSUME(this.T.StringLiteral)
                }
              }
            ])
          })
          this.CONSUME(this.T.RSquare)
        }
      },
      {
        ALT: () => {
          this.SUBRULE(this.nameSelector)
        }
      }
    ])
  })

  nameSelector = this.RULE('nameSelector', () => this.CONSUME(this.T.Selector))

  /**
   * e.g.
   *   color: red
   */
  declaration = this.RULE('declaration', () => {
    this.SUBRULE(this.property)
    this._()
    this.CONSUME(this.T.Assign)
    this.SUBRULE(this.expressionList)
    this.OPTION(() => this.CONSUME(this.T.SemiColon))
  })

  customValue = this.RULE('customValue', () => {
    this.MANY(() =>
      this.OR([
        { ALT: () => this.SUBRULE(this.anyValue, { LABEL: 'value' }) },
        { ALT: () => this.SUBRULE(this.extraValues, { LABEL: 'value' }) },
        { ALT: () => this.SUBRULE(this.customBlock, { LABEL: 'value' }) }
      ])
    )
  })

  /**
   * e.g.
   *   --color: { ;red }
   */
  customDeclaration = this.RULE('customDeclaration', () => {
    this.SUBRULE(this.customProperty)
    this._()
    this.CONSUME(this.T.Assign)
    this.SUBRULE(this.customValue)
    this.OPTION(() => this.CONSUME(this.T.SemiColon))
  })

  /** "color" in "color: red" */
  property = this.RULE('property', () => this.CONSUME(this.T.Ident))
  customProperty = this.RULE('customProperty', () => this.CONSUME(this.T.CustomProperty))

  /**
   * List of expression lists (or expression list if only 1),
   * separated by semi-colon. This handles / formats arbitrary
   * semi-colons or separating semi-colons in declaration lists
   * within parentheses or brackets.
   */
  expressionListGroup = this.RULE('expressionListGroup', () => {
    this.AT_LEAST_ONE(() => {
      this.SUBRULE(this.expressionList)
      this.OPTION(() => this.CONSUME(this.T.SemiColon))
    })
  })

  expressionList = this.RULE('expressionList', () => {
    this.MANY_SEP({
      SEP: this.T.Comma,
      DEF: () => this.SUBRULE(this.expression)
    })
  })

  /**
   *  An expression contains values and spaces
   */
  expression = this.RULE('expression', () => {
    this.MANY(() => this.SUBRULE(this.value))
  })

  /**
   * According to a reading of the spec, whitespace is a valid
   * value in a CSS list, e.g. in the custom properties spec,
   * `--custom: ;` has a value of ' '
   *
   * However, a property's grammar may discard whitespace between values.
   * e.g. for `color: black`, the value in the browser will resolve to `black`
   * and not ` black`. The CSS spec is rather hand-wavy about whitespace,
   * sometimes mentioning it specifically, sometimes not representing it
   * in grammar even though it's expected to be present.
   *
   * Strictly speaking, though, a property's value begins _immediately_
   * following a ':' and ends at ';' (or until automatically closed by
   * '}', ']', ')' or the end of a file).
   */
  value = this.RULE('value', () =>
    this.OR([{ ALT: () => this.SUBRULE(this.block) }, { ALT: () => this.SUBRULE(this.anyValue) }])
  )

  anyValue = this.RULE('anyValue', () =>
    this.OR([
      { ALT: () => this.CONSUME(this.T.Value) },
      { ALT: () => this.CONSUME(this.T.Colon) },
      { ALT: () => this.CONSUME(this.T.WS) }
    ])
  )

  /**
   * Extra tokens in a custom property
   */
  extraValues = this.RULE('extraValues', () =>
    this.OR([
      { ALT: () => this.CONSUME(this.T.AtName) },
      { ALT: () => this.CONSUME(this.T.CustomProperty) },
      { ALT: () => this.CONSUME(this.T.Comma) },
      { ALT: () => this.CONSUME(this.T.SemiColon) }
    ])
  )

  curlyBlock = this.RULE('curlyBlock', () => {
    this.CONSUME(this.T.LCurly, { LABEL: 'L' })
    this.SUBRULE(this.primary, { LABEL: 'blockBody' })
    this.CONSUME(this.T.RCurly, { LABEL: 'R' })
  })

  /**
   * Everything in `[]` or `()` we evaluate as raw expression lists,
   * or groups of expression lists (divided by semi-colons).
   *
   * The CSS spec suggests that `[]`, `()`, `{}` should be treated equally,
   * as generic blocks, so I'm not sure of this, but in the language
   * _so far_, there's some distinction between these block types.
   * AFAIK, `[]` is only used formally in CSS grid and with attribute
   * identifiers, and `()` is used for functions and at-rule expressions.
   *
   * It would be great if CSS formalized this distinction, but for now,
   * this seems safe.
   */
  block = this.RULE('block', () => {
    this.OR([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(this.T.LParen, { LABEL: 'L' }) },
            { ALT: () => this.CONSUME(this.T.Function, { LABEL: 'Function' }) }
          ])
          this.SUBRULE(this.expressionListGroup, { LABEL: 'blockBody' })
          this.CONSUME(this.T.RParen, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LSquare, { LABEL: 'L' })
          this.SUBRULE2(this.expressionListGroup, { LABEL: 'blockBody' })
          this.CONSUME(this.T.RSquare, { LABEL: 'R' })
        }
      }
    ])
  })

  /**
   * Blocks assigned to custom properties
   */
  customBlock = this.RULE('customBlock', () => {
    this.OR([
      {
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(this.T.LParen, { LABEL: 'L' }) },
            { ALT: () => this.CONSUME(this.T.Function, { LABEL: 'Function' }) }
          ])
          this.SUBRULE(this.customValue, { LABEL: 'blockBody' })
          this.CONSUME(this.T.RParen, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LSquare, { LABEL: 'L' })
          this.SUBRULE2(this.customValue, { LABEL: 'blockBody' })
          this.CONSUME(this.T.RSquare, { LABEL: 'R' })
        }
      },
      {
        ALT: () => {
          this.CONSUME(this.T.LCurly, { LABEL: 'L' })
          this.SUBRULE3(this.customValue, { LABEL: 'blockBody' })
          this.CONSUME(this.T.RCurly, { LABEL: 'R' })
        }
      }
    ])
  })
}
