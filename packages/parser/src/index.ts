import { IToken, Lexer } from 'chevrotain'
import { Tokens, Fragments } from './lessTokens'
import { createLexer, IParseResult } from '@less/css-parser'
import { LessParser } from './lessParser'

export class Parser {
  lexer: Lexer
  parser: LessParser

  constructor() {
    const { lexer, tokens, T } = createLexer(Fragments, Tokens)
    this.lexer = lexer
    this.parser = new LessParser(tokens, T)
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