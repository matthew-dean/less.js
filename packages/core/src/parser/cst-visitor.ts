import { LessParser } from '@less/parser'

export const CstVisitor = (parser: LessParser) => {
  /** crawl the CST and make an AST */
  const LessVisitor = parser.getBaseCstVisitorConstructorWithDefaults()

  return new class CstVisitor extends LessVisitor {
    constructor() {
      super()
      this.validateVisitor()
    }

    primary(ctx: any) {
      /** Start building AST */
      return {
        type: "SELECT_CLAUSE",
        columns: ''
      }
    }
  }
}