import { LessParser } from '@less/parser'
import {
  Node,
  Rule,
  Rules,
  Value,
  ILocationInfo,
  Expression,
  List,
  MergeType,
  Declaration,
  Op
} from '../tree/nodes'
import { colorFromKeyword } from '../tree/util/color'
import { IToken, CstNode } from 'chevrotain'

/** crawl the CST and make an AST */
export const CstVisitor = (parser: LessParser) => {
  const LessVisitor = parser.getBaseCstVisitorConstructorWithDefaults()

  return new class extends LessVisitor {
    constructor() {
      super()
      this.validateVisitor()
    }

    COLLAPSE_TOKENS(tokens: IToken[]): ILocationInfo & { image: string } {
      let image: string = ''
      const { startLine, startColumn, startOffset } = tokens[0]
      const { endLine, endColumn, endOffset } = tokens[tokens.length - 1]
      
      tokens.forEach(token => {
        image += token.image
      })

      return {
        image,
        startLine,
        startColumn,
        startOffset,
        endLine,
        endColumn,
        endOffset
      }
    }

    SPAN_NODES(node: Node | Node[]): { nodes: Node[], location: ILocationInfo } {
      const nodes = Array.isArray(node) ? node : [node]
      const { startLine, startColumn, startOffset } = nodes[0]
      const { endLine, endColumn, endOffset } = nodes[nodes.length - 1]

      return {
        nodes,
        location: {
          startLine,
          startColumn,
          startOffset,
          endLine,
          endColumn,
          endOffset
        }
      }
    }

    isToken(value: any): value is IToken {
      return 'image' in value
    }

    /**
     * Given a CstNode or IToken or array, produces a single result
     */
    visit(value: (CstNode | IToken) | (CstNode | IToken)[]): any {
      if (Array.isArray(value)) {
        value = value[0]
      }
      if (this.isToken(value)) {
        const {
          image,
          startLine, startColumn, startOffset,
          endLine, endColumn, endOffset
        } = value
        return new Value(image, {}, {
          startLine, startColumn, startOffset,
          endLine, endColumn, endOffset
        })
      } else {
        return super.visit(value)
      }
    }

    /**
     * Visits an array of productions, returning Less Nodes
     */
    visitArray(
      nodes: (CstNode | IToken)[],
      { pre, preOffset = 1 }: {
        pre?: IToken[]
        preOffset?: number
      } = {}
    ): Node[] {
      let newNodes: Node[] = []
      nodes.forEach((node, i) => {
        const returnVal: Node | Node[] = this.visit(node)
        if (returnVal) {
          const returnNodes: Node[] = Array.isArray(returnVal) ? returnVal : [returnVal]
          
          if (pre) {
            const preToken = pre[i - preOffset]
            if (preToken) {
              returnNodes[0].pre = preToken.image
            }
          }
          newNodes.push.apply(newNodes, returnNodes)
        }
      })
      return newNodes
    }

    /** Start building AST */
    root(ctx: any) {
      const rules = this.visit(ctx.primary)
      return new Rules(rules)
    }

    primary(ctx: any) {
      return this.visitArray(ctx.rule) 
    }

    rule(ctx: any) {
      let rule: any // Node
      if (ctx.qualifiedRule) {
        rule = this.visit(ctx.qualifiedRule)
      } else if (ctx.declaration) {
        rule = this.visit(ctx.declaration)
      }
      /** @todo - extract comments */
      if (ctx.pre) {
        rule.pre = ctx.pre[0].image
      }
      return rule
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
      const selectors = this.visitArray(ctx.selector, { pre: ctx.pre })
      const { nodes, location } = this.SPAN_NODES(selectors)
      
      return new List(nodes, {}, location)
    }

    complexSelector(ctx: any) {
      const selectors = this.visitArray(ctx.selector)
      const { nodes, location } = this.SPAN_NODES(selectors)
      
      return new Expression(nodes, {}, location)
    }

    /** Return an array of Value nodes */
    compoundSelector(ctx: any) {
      return this.visitArray(ctx.selector)
    }

    combinatorSelector(ctx: any) {
      const combinator = ctx.combinator[0]
      const op = new Op(combinator.image)
      return [op]
    }

    simpleSelector(ctx: any) {
      return this.visit(ctx.selector)
    }

    nameSelector(ctx: any) {
      return this.visit(ctx.selector)
    }

    declaration(ctx: any) {
      const name = this.visit(ctx.name)
      const assignOp = (<IToken>ctx.op[0]).tokenType.name
      let opts
      if (assignOp === 'PlusAssign') {
        opts = { mergeType: MergeType.COMMA }
      } else if (assignOp === 'UnderscoreAssign') {
        opts = { mergeType: MergeType.SPACED }
      }
      const nodes: [Node] = [this.visit(ctx.value)]

      return new Declaration({ name, nodes }, opts)
    }

    property(ctx: any) {
      const { image, ...location } = this.COLLAPSE_TOKENS(ctx.name)
      return new Value(image, {}, location)
    }

    expressionList(ctx: any) {
      const expressions = this.visitArray(ctx.expression)
      return new List(expressions)
    }

    expression(ctx: any) {
      const value = this.visitArray(ctx.value)
      return value
    }

    addition(ctx: any) {
      if (!ctx.rhs) {
        return this.visit(ctx.lhs)
      }
    }

    multiplication(ctx: any) {
      if (!ctx.rhs) {
        return this.visit(ctx.lhs)
      }
    }

    value(ctx: any) {
      if (ctx.Ident) {
        return colorFromKeyword(ctx.Ident[0].image)
      }
      return {}
    }

    curlyBlock(ctx: any) {
      const L = ctx.L[0]
      const R = ctx.R[0]
      const { startLine, startColumn, startOffset } = L
      const { endLine, endColumn, endOffset } = R
      const nodes = this.visit(ctx.blockBody)

      return new Rules({ nodes, pre: L.image, post: R.image }, {}, {
        startLine, startColumn, startOffset,
        endLine, endColumn, endOffset
      })
    }

    blockBody(ctx: any) {
      return this.visit(ctx.primary)
    }
  }
}