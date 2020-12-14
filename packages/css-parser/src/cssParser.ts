import { TokenType, IParserConfig, BaseParser, IRuleConfig } from 'chevrotain'
import { EmbeddedActionsParser } from 'chevrotain'
import { TokenMap } from './util'
import root from './productions/root'
import atRules from './productions/atRules'
import blocks from './productions/blocks'
import selectors from './productions/selectors'
import declarations from './productions/declarations'
import values from './productions/values'

export type Rule = (idxInCallingRule?: number, ...args: any[]) => any

/**
 * CST structure as follows
 *
 * @example
 * ```
 * {
 *   name: 'root'
 *   nodes: [
 *     {
 *       name: 'AtRule',
 *       nodes: [...]
 *       location: {...}
 *     },
 *     {
 *       name: 'WS',
 *       value: '\n',
 *       location: {...}
 *     }
 *   ]
 *   location: {...}
 * }
 * ```
 */
export type CstLocation = {
  startOffset: number
  startLine?: number
  startColumn?: number
  endOffset?: number
  endLine?: number
  endColumn?: number
}

export type CstToken = {
  name: string
  value: string
  location?: CstLocation
}

export type CstNode = {
  name: string
  nodes: (CstNode | CstToken)[]
  location?: CstLocation
}

export class CssParser extends EmbeddedActionsParser {
  T: TokenMap
  _: Function

  option: BaseParser['option']
  consume: BaseParser['consume']

  /** Productions */
  root: Rule
  primary: Rule
  rule: Rule
  atRule: Rule
  knownAtRule: Rule
  unknownAtRule: Rule
  atImport: Rule
  atMedia: Rule
  atSupports: Rule
  atNested: Rule
  atNonNested: Rule

  /** @media */
  mediaQuery: Rule
  mediaCondition: Rule
  mediaFeature: Rule
  mediaAnd: Rule

  /** blocks */
  qualifiedRule: Rule
  testQualifiedRule: Rule
  testQualifiedRuleExpression: Rule
  block: Rule
  curlyBlock: Rule
  customBlock: Rule
  customPreludeBlock: Rule

  /** Selector rules */
  selectorList: Rule
  complexSelector: Rule
  combinatorSelector: Rule
  compoundSelector: Rule
  simpleSelector: Rule
  pseudoSelector: Rule
  attrSelector: Rule
  attrIdent: Rule
  nameSelector: Rule

  /** declarations */
  declaration: Rule
  customDeclaration: Rule
  property: Rule
  customProperty: Rule

  /** expressions */
  expressionListGroup: Rule
  expressionList: Rule
  expression: Rule

  /** values */
  value: Rule
  atomicValue: Rule
  customValue: Rule
  customPrelude: Rule
  customValueOrSemi: Rule
  anyToken: Rule
  extraTokens: Rule

  protected CAPTURE_INDEX: number[] = []
  protected currIdx: number

  constructor(
    tokens: TokenType[],
    T: TokenMap,
    config: IParserConfig = {
      maxLookahead: 1,
      recoveryEnabled: true
    }
  ) {
    super(tokens, config)
    const $ = this
    $.T = T

    root.call($, $)
    atRules.call($, $)
    blocks.call($, $)
    selectors.call($, $)
    declarations.call($, $)
    values.call($, $)

    /** If this is extended, don't perform self-analysis twice */
    if ($.constructor === CssParser) {
      $.performSelfAnalysis()
    }
  }

  protected RULE<T>(name: string, impl: (...implArgs: any[]) => T, config?: IRuleConfig<T>) {
    return super.RULE(
      name,
      (...args: any[]) => {
        const result = impl(args)
        return result
      },
      config
    )
  }

  protected OVERRIDE_RULE<T>(
    name: string,
    impl: (...implArgs: any[]) => T,
    config?: IRuleConfig<T>
  ) {
    return super.OVERRIDE_RULE(
      name,
      (...args: any[]) => {
        const result = impl(args)
        return result
      },
      config
    )
  }
}
