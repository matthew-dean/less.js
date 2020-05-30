import type { IToken, Lexer, CstNode, ILexingResult } from 'chevrotain'
import { Tokens, Fragments } from './cssTokens'
import { CssParser } from './cssParser'
import { createLexer } from './util'

export * from './cssTokens'
export * from './util'
export * from './cssParser'

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

  parse(text: string): IParseResult {
    const parser = this.parser
    const lexerResult = this.lexer.tokenize(text)
    const lexedTokens: IToken[] = lexerResult.tokens
    parser.input = lexedTokens
    const cst = parser.primary()

    return { cst, lexerResult, parser }
  }
}
