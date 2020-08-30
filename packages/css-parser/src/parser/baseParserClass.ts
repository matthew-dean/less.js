import {
  EmbeddedActionsParser,
  TokenType,
  IToken,
  ConsumeMethodOpts,
  SubruleMethodOpts,
  CstElement,
  tokenMatcher,
  EOF
} from 'chevrotain'

export interface ICaptureResult {
  tokens: IToken[]
  elements: CstElement[]
}

export class BaseParserClass extends EmbeddedActionsParser {
  protected CAPTURE_INDEX: number[] = []
  protected currIdx: number

  public PEEK(tokenToFind: IToken): boolean {
    let token: IToken = this.LA(1)
    const tokenType = tokenToFind.tokenType
    let i = 1
    let found = false
    while (token.tokenType !== EOF) {
      if (tokenMatcher(token, tokenType)) {
        found = true
        break
      }
      i++
      token = this.LA(i)
    }
    return found
  }

  public CAPTURE(): number {
    let idx = -1
    if (!this.RECORDING_PHASE) {
      /** Capture start index */
      idx = this.currIdx + 1
      this.CAPTURE_INDEX.push(idx)
    }
    return idx
  }

  public END_CAPTURE(): IToken[] {
    let tokens: IToken[] = []
    if (!this.RECORDING_PHASE) {
      const startIndex = this.CAPTURE_INDEX.pop()
      const endIndex = this.currIdx + 1
      tokens = this.input.slice(startIndex, endIndex)
    }
    return tokens
  }
}
