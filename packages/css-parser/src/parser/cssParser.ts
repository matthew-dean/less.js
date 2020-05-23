import {
  EMPTY_ALT,
  TokenType,
  CstNode,
  CstElement,
  EmbeddedActionsParser,
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
export class CssParser extends EmbeddedActionsParser {
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

  WS(idx: number = 0) {
    // +10 to avoid conflicts with other OPTION in the calling rule.
    return this.option(idx + 10, () => {
      const wsToken = this.consume(idx, this.T.WS)
      return wsToken
    })
  }

  primary = this.RULE(
    'primary',
    (): CstNode => {
      const rules: CstElement[] = []
      this.MANY(() => {
        const rule = this.SUBRULE(this.rule)
        rule && rules.push(rule)
      })
      let post: spaceToken = {}
      const ws = this.WS()
      if (ws) {
        post = { post: [ws] }
      }
      return <CstNode>{
        name: 'primary',
        children: {
          rules,
          ...post
        }
      }
    }
  )

  /** Capture semi-colon fragment */
  semi = this.RULE(
    'semi',
    (): CstNode => {
      const semi = this.CONSUME(this.T.SemiColon)
      return {
        name: 'isolatedSemiColon',
        children: { semi: [semi] }
      }
    }
  )

  rule = this.RULE('rule', (): CstNode | undefined => {
    const ws = this.WS()
    const rule: CstNode = this.OR([
      { ALT: () => this.SUBRULE(this.atRule) },
      { ALT: () => this.SUBRULE(this.customDeclaration) },
      {
        GATE: this.BACKTRACK(this.testQualifiedRule),
        ALT: () => this.SUBRULE(this.qualifiedRule)
      },
      { ALT: () => this.SUBRULE2(this.declaration) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => this.SUBRULE(this.semi) },
      { ALT: () => EMPTY_ALT }
    ])

    if (rule.children) {
      if (ws) {
        rule.children.pre = [ws]
      }
      return rule
    } else if (ws) {
      return {
        name: 'ws',
        children: {
          value: [ws]
        }
      }
    }
  })

  /**
   * Everything up to an (outer) ';' or '{' is the AtRule's prelude
   */
  atRule = this.RULE(
    'atRule',
    (): CstNode => {
      const name = [this.CONSUME(this.T.AtName)]
      const expr = this.SUBRULE(this.expressionList)
      const optionals: {
        body?: CstNode[]
        SemiColon?: IToken[]
      } = {}
      this.OR([
        {
          ALT: () => {
            optionals.body = [this.SUBRULE(this.curlyBlock)]
          }
        },
        {
          ALT: () =>
            this.OPTION(() => {
              optionals.SemiColon = [this.CONSUME(this.T.SemiColon)]
            })
        }
      ])

      return <CstNode>{
        name: 'atRule',
        children: {
          name,
          ...(expr ? { prelude: [expr] } : {}),
          ...optionals
        }
      }
    }
  )

  /**
   *
   */
  qualifiedRule = this.RULE(
    'qualifiedRule',
    (): CstNode => {
      const selector = [this.SUBRULE(this.selectorList)]
      const body = [this.SUBRULE(this.curlyBlock)]

      return {
        name: 'qualifiedRule',
        children: { selector, body }
      }
    }
  )

  /**
   * Test for qualified rule start
   */
  testQualifiedRule = this.RULE(
    'testQualifiedRule',
    (): IToken => {
      this.SUBRULE(this.selectorList)
      return this.CONSUME(this.T.LCurly)
    }
  )

  /** A comma-separated list of selectors */
  selectorList = this.RULE(
    'selectorList',
    (): CstNode => {
      let Comma: IToken[] = []
      let sel: CstNode
      let selectors: CstNode[] = [this.SUBRULE(this.complexSelector)]

      this.MANY(() => {
        const comma = this.CONSUME(this.T.Comma)
        Comma.push(comma)
        sel = this.SUBRULE2(this.complexSelector)
        selectors.push(sel)
      })

      if (sel) {
        return {
          name: 'selectorList',
          children: {
            ...(Comma && Comma.length > 0 ? { Comma } : {}),
            ...(selectors ? { selectors } : {})
          }
        }
      }
    }
  )

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
  complexSelector = this.RULE(
    'complexSelector',
    (): CstNode => {
      const space: spaceToken = {}
      let ws = this.WS(8)
      if (ws) {
        space.pre = [ws]
      }
      ws = undefined
      let selector: CstElement[] = [this.SUBRULE(this.compoundSelector)]

      this.MANY(() => {
        this.OR([
          {
            ALT: () => {
              /**
               * Combinator with optional whitespace
               */
              const tokens: IToken[] = [this.CONSUME(this.T.Combinator)]
              this.OPTION(() => {
                tokens.push(this.CONSUME(this.T.WS))
              })
              selector.push({
                name: 'combinator',
                children: { tokens }
              })
              selector.push(this.SUBRULE2(this.compoundSelector))
            }
          },
          {
            /**
             * Whitespace with optional combinator,
             * (or we treat as trailing ws)
             */
            ALT: () => {
              let tokens: IToken[]
              let ws = this.CONSUME2(this.T.WS)
              this.OPTION2(() => {
                tokens = [ws]
                this.OPTION3(() => {
                  tokens.push(this.CONSUME2(this.T.Combinator))
                  this.OPTION4(() => {
                    tokens.push(this.CONSUME3(this.T.WS))
                  })
                })
                selector.push({
                  name: 'combinator',
                  children: { tokens }
                })
                selector.push(this.SUBRULE3(this.compoundSelector))
              })
            }
          }
        ])
      })

      if (ws) {
        space.post = [ws]
      }

      return {
        name: 'complexSelector',
        children: {
          selector,
          ...space
        }
      }
    }
  )

  /**
   * "A compound selector is a sequence of simple selectors that are not separated by a combinator,
   * and represents a set of simultaneous conditions on a single element. If it contains a type
   * selector or universal selector, that selector must come first in the sequence."
   *
   * @see https://www.w3.org/TR/selectors-4/#structure
   */
  compoundSelector = this.RULE(
    'compoundSelector',
    (): CstNode => {
      let selector: CstElement[] = []

      this.OR([
        { ALT: () => selector.push(this.CONSUME(this.T.Star)) },
        {
          ALT: () => {
            this.AT_LEAST_ONE(() => selector.concat(this.SUBRULE(this.simpleSelector)))
          }
        }
      ])

      return {
        name: 'compoundSelector',
        children: { selector }
      }
    }
  )

  /**
   * "A simple selector is a single condition on an element. A type selector,
   * universal selector, attribute selector, class selector, ID selector,
   * or pseudo-class is a simple selector."
   *
   * @see https://www.w3.org/TR/selectors-4/#structure
   */
  simpleSelector = this.RULE('simpleSelector', (): CstElement[] => {
    let values: CstElement[]
    this.OR([
      {
        /** e.g. :pseudo or ::pseudo */
        ALT: () => {
          values = [this.CONSUME(this.T.Colon)]
          this.OPTION(() => {
            values.push(this.CONSUME2(this.T.Colon))
          })
          this.OR2([
            { ALT: () => values.push(this.CONSUME(this.T.Ident)) },
            /** e.g. :pseudo(...) */
            {
              ALT: () => {
                values.push(this.CONSUME(this.T.Function))
                values.push(this.SUBRULE(this.expressionListGroup))
                values.push(this.CONSUME(this.T.RParen))
              }
            }
          ])
        }
      },
      {
        /** e.g. [id^="bar"] */
        ALT: () => {
          values = [this.CONSUME(this.T.LSquare), this.CONSUME2(this.T.Ident)]
          this.OPTION2(() => {
            this.OR3([
              { ALT: () => values.push(this.CONSUME(this.T.Eq)) },
              { ALT: () => values.push(this.CONSUME(this.T.AttrMatch)) }
            ])
            this.OR4([
              {
                ALT: () => {
                  values.push(this.CONSUME3(this.T.Ident))
                }
              },
              {
                ALT: () => {
                  values.push(this.CONSUME(this.T.StringLiteral))
                }
              }
            ])
          })
          values.push(this.CONSUME(this.T.RSquare))
        }
      },
      {
        ALT: () => {
          values = [this.SUBRULE(this.nameSelector)]
        }
      }
    ])
    return values
  })

  nameSelector = this.RULE('nameSelector', () => {
    return this.CONSUME(this.T.Selector)
  })

  /**
   * e.g.
   *   color: red
   *   --color: { ;red }
   */
  declarationBody = this.RULE(
    'declarationBody',
    (): CstNode => {
      const ws = this.WS()
      let colon: IToken = this.CONSUME(this.T.Assign)

      const value = this.SUBRULE(this.expressionList)
      let semi: IToken
      this.OPTION(() => {
        semi = this.CONSUME(this.T.SemiColon)
      })

      return {
        name: 'declaration',
        children: {
          ...(ws ? { ws: [ws] } : {}),
          Colon: [colon],
          value: [value],
          ...(semi ? { SemiColon: [semi] } : {})
        }
      }
    }
  )

  declaration = this.RULE(
    'declaration',
    (): CstNode => {
      const property = this.SUBRULE(this.property)
      const decl = this.SUBRULE(this.declarationBody)
      this.ACTION(() => {
        decl.children.property = property
      })
      return decl
    }
  )

  customValue = this.RULE('customValue', (): CstElement[] => {
    const value: CstElement[] = []
    this.MANY(() => {
      value.push(
        this.OR([
          { ALT: () => this.SUBRULE(this.anyValue) },
          { ALT: () => this.SUBRULE(this.extraValues) },
          { ALT: () => this.SUBRULE(this.customBlock) }
        ])
      )
    })
    return value
  })

  customDeclaration = this.RULE(
    'customDeclaration',
    (): CstNode => {
      const property = this.SUBRULE(this.customProperty)
      const ws = this.WS()
      const colon: IToken = this.CONSUME(this.T.Assign)
      const value = this.SUBRULE(this.customValue)
      let semi: IToken

      this.OPTION(() => {
        semi = this.CONSUME(this.T.SemiColon)
      })

      return {
        name: 'declaration',
        children: {
          property,
          ...(ws ? { ws: [ws] } : {}),
          Colon: [colon],
          value: value,
          ...(semi ? { SemiColon: [semi] } : {})
        }
      }
    }
  )

  /** "color" in "color: red" */
  property = this.RULE('property', (): IToken[] => [this.CONSUME(this.T.Ident)])
  customProperty = this.RULE('customProperty', (): IToken[] => [
    this.CONSUME(this.T.CustomProperty)
  ])

  /**
   * List of expression lists (or expression list if only 1),
   * separated by semi-colon. This handles / formats arbitrary
   * semi-colons or separating semi-colons in declaration lists
   * within parentheses or brackets.
   */
  expressionListGroup = this.RULE(
    'expressionListGroup',
    (): CstNode => {
      let isGroup = false
      let SemiColon: IToken[]
      let expressionList: CstNode[]
      let list: CstNode = this.SUBRULE(this.expressionList)
      let semi: IToken

      this.OPTION(() => {
        semi = this.CONSUME(this.T.SemiColon)
        isGroup = true
        expressionList = [list]
        SemiColon = [semi]
        this.MANY(() => {
          list = this.SUBRULE2(this.expressionList)
          expressionList.push(list)
          SemiColon = [semi]
          this.OPTION2(() => {
            semi = this.CONSUME2(this.T.SemiColon)
            SemiColon.push(semi)
          })
        })
      })
      if (isGroup) {
        return {
          name: 'expressionListGroup',
          children: {
            SemiColon,
            expressionList
          }
        }
      } else if (list) {
        return list
      }
    }
  )

  expressionList = this.RULE(
    'expressionList',
    (): CstNode => {
      let expressions: CstNode[]
      let Comma: IToken[] = []
      let expr: CstNode = this.SUBRULE(this.expression)
      if (expr) {
        expressions = [expr]
      } else {
        expressions = []
      }

      this.MANY(() => {
        let comma = this.CONSUME(this.T.Comma)
        Comma.push(comma)
        expr = this.SUBRULE2(this.expression)
        expressions.push(expr)
      })

      if (expr) {
        return {
          name: 'expressionList',
          children: {
            ...(Comma && Comma.length > 0 ? { Comma } : {}),
            ...(expressions ? { expression: expressions } : {})
          }
        }
      }
    }
  )

  /**
   *  An expression contains values and spaces
   */
  expression = this.RULE('expression', (): CstNode | undefined => {
    let values: CstElement[] = []
    let val: CstElement | undefined

    this.MANY(() => {
      val = this.SUBRULE(this.value)
      values.push(val)
    })

    if (val) {
      return {
        name: 'expression',
        children: { values }
      }
    }
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
  value = this.RULE(
    'value',
    (): CstElement => {
      return this.OR([
        { ALT: () => this.SUBRULE(this.block) },
        { ALT: () => this.SUBRULE(this.anyValue) }
      ])
    }
  )

  anyValue = this.RULE(
    'anyValue',
    (): CstElement => {
      return this.OR([
        { ALT: () => this.CONSUME(this.T.Value) },
        { ALT: () => this.CONSUME(this.T.Colon) },
        { ALT: () => this.CONSUME(this.T.WS) }
      ])
    }
  )

  /**
   * Extra tokens in a custom property
   */
  extraValues = this.RULE(
    'extraValues',
    (): CstElement => {
      return this.OR([
        { ALT: () => this.CONSUME(this.T.AtName) },
        { ALT: () => this.CONSUME(this.T.CustomProperty) },
        { ALT: () => this.CONSUME(this.T.Comma) },
        { ALT: () => this.CONSUME(this.T.SemiColon) }
      ])
    }
  )

  /** "red" in "color: red" */
  propertyValue = this.RULE(
    'propertyValue',
    (): CstElement => {
      return this.OR([
        { ALT: () => this.SUBRULE(this.block) },
        { ALT: () => this.CONSUME(this.T.Value) }
      ])
    }
  )

  curlyBlock = this.RULE<CstNode>('curlyBlock', () => {
    const L = [this.CONSUME(this.T.LCurly)]
    const blockBody = [this.SUBRULE(this.primary)]
    const R = [this.CONSUME(this.T.RCurly)]

    return {
      name: 'curlyBlock',
      children: {
        L,
        blockBody,
        R
      }
    }
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
  block = this.RULE(
    'block',
    (): CstNode => {
      let L: IToken[]
      let R: IToken[]
      let Function: IToken[]
      let blockBody: CstNode[]

      this.OR([
        {
          ALT: () => {
            this.OR2([
              { ALT: () => (L = [this.CONSUME(this.T.LParen)]) },
              { ALT: () => (Function = [this.CONSUME(this.T.Function)]) }
            ])
            blockBody = [this.SUBRULE(this.expressionListGroup)]
            R = [this.CONSUME(this.T.RParen)]
          }
        },
        {
          ALT: () => {
            L = [this.CONSUME(this.T.LSquare)]
            blockBody = [this.SUBRULE2(this.expressionListGroup)]
            R = [this.CONSUME(this.T.RSquare)]
          }
        }
      ])
      return {
        name: 'block',
        children: {
          ...(L ? { L } : {}),
          ...(Function ? { Function } : {}),
          blockBody,
          R
        }
      }
    }
  )

  /**
   * Blocks assigned to custom properties
   */
  customBlock = this.RULE(
    'customBlock',
    (): CstNode => {
      let L: IToken[]
      let R: IToken[]
      let Function: IToken[]
      let blockBody: CstElement[]

      this.OR([
        {
          ALT: () => {
            this.OR2([
              { ALT: () => (L = [this.CONSUME(this.T.LParen)]) },
              { ALT: () => (Function = [this.CONSUME(this.T.Function)]) }
            ])
            blockBody = this.SUBRULE(this.customValue)
            R = [this.CONSUME(this.T.RParen)]
          }
        },
        {
          ALT: () => {
            L = [this.CONSUME(this.T.LSquare)]
            blockBody = this.SUBRULE2(this.customValue)
            R = [this.CONSUME(this.T.RSquare)]
          }
        },
        {
          ALT: () => {
            L = [this.CONSUME(this.T.LCurly)]
            blockBody = this.SUBRULE3(this.customValue)
            R = [this.CONSUME(this.T.RCurly)]
          }
        }
      ])
      return {
        name: 'block',
        children: {
          ...(L ? { L } : {}),
          ...(Function ? { Function } : {}),
          blockBody,
          R
        }
      }
    }
  )
}
