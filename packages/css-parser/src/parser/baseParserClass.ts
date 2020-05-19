import {
  EmbeddedActionsParser,
  TokenType,
  IToken,
  ConsumeMethodOpts,
  SubruleMethodOpts,
  CstElement
} from 'chevrotain'

export interface ICaptureResult {
  tokens: IToken[]
  elements: CstElement[]
}

export class BaseParserClass extends EmbeddedActionsParser {
  protected CAPTURE_INDEX: number[] = []
  protected currIdx: number

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
