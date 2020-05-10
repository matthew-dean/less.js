import { IToken, Lexer, CstNode, ILexingResult } from 'chevrotain'
import { Tokens, Fragments } from '../cssTokens'
import { CssParser } from './cssParser'
import { createLexer } from '../util'

// let { parser, lexer, tokens, T } = createParser(CssStructureParser, Fragments, Tokens)
// const cssVisitor = CssStructureVisitor(
//   parser.getBaseCstVisitorConstructorWithDefaults()
// )
export interface IParseResult {
  cst: CstNode
  lexerResult: ILexingResult
  parser: CssParser
}

export class Parser {
  lexer: Lexer
  parser: CssParser

  constructor() {
    const { lexer, tokens, T } = createLexer(Fragments, Tokens)
    this.lexer = lexer
    this.parser = new CssParser(tokens, T)
  }
  // constructor(structureOnly: boolean = false) {
  //   const { lexer, tokens, T } = createLexer(Fragments, Tokens)
  //   this.lexer = lexer
  //   if (structureOnly) {
  //     this.parser = new CssStructureParser(tokens, T)
  //   } else {
  //     const ruleParser = new CssRuleParser(tokens, T)
  //     this.parser = new CssStructureParser(tokens, T, undefined, ruleParser)
  //   }
  // }

  parse(text: string): IParseResult {
    const lexerResult = this.lexer.tokenize(text)
    const lexedTokens: IToken[] = lexerResult.tokens
    this.parser.input = lexedTokens
    const cst = this.parser.primary()

    return { cst, lexerResult, parser: this.parser }
  }
}
