import { LessParser } from '@less/parser'
import {
  Node,
  Rule,
  Rules
} from '../tree/nodes'

/** crawl the CST and make an AST */
export const CstVisitor = (parser: LessParser) => {
  const LessVisitor = parser.getBaseCstVisitorConstructorWithDefaults()

  return new class extends LessVisitor {
    constructor() {
      super()
      this.validateVisitor()
    }

    /** Start building AST */
    primary(ctx: any) {
      const rules = this.visit(ctx.rule)

      if (rules instanceof Rules) {
        return rules
      }
      
      return new Rules(rules)
    }

    rule(ctx: any) {
      let rule: any // Node
      if (ctx.qualifiedRule) {
        return this.visit(ctx.qualifiedRule)
      } else if (ctx.declaration) {
        return this.visit(ctx.declaration)
      }
      return {}
    }

    qualifiedRule(ctx: any) {
      const selectors = this.visit(ctx.selectorList)
      const rules = this.visit(ctx.curlyBlock)
      return new Rule({
        selectors,
        rules
      })
    }

    selectorList(ctx: any) {
      const selectors = this.visit(ctx.complexSelector)
      
      return {}
    }

    complexSelector(ctx: any) {
      const selectors = this.visit(ctx.selector)
      
      return {}
    }

    compoundSelector(ctx: any) {
      return {}
    }

    declaration(ctx: any) {
      return {}
    }

    curlyBlock(ctx: any) {
      const L = ctx.L[0]
      const R = ctx.R[0]
      const { startLine, startColumn, startOffset } = L
      const { endLine, endColumn, endOffset } = R
      const rules = this.visit(ctx.blockBody)

      return new Rules([], { pre: L.image, post: R.image }, {
        startLine, startColumn, startOffset,
        endLine, endColumn, endOffset
      })
    }

    blockBody(ctx: any) {
      return this.visit(ctx.primary)
    }
  }
}