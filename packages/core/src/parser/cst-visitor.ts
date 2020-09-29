import { IToken, CstNode, CstChildrenDictionary } from 'chevrotain'
import { LessParser, Tokens } from '@less/parser'
import {
  Node,
  Rule,
  Rules,
  Value,
  Expression,
  List,
  MergeType,
  Declaration,
  Op,
  Num, Operation
} from '../tree/nodes'
import { colorFromKeyword } from '../tree/util/color'
import { processWS, collapseTokens, spanNodes, isToken, flatten } from './util'

/** crawl the CST and make an AST */
export const CstVisitor = (parser: LessParser) => {
  const LessVisitor = parser.getBaseCstVisitorConstructorWithDefaults()

  return new (class extends LessVisitor {
    constructor() {
      super()
      this.validateVisitor()
    }

    /**
     * Given a CstNode or IToken or array, produces a single result
     */
    visit(value: (CstNode | IToken) | (CstNode | IToken)[]): any {
      if (Array.isArray(value)) {
        value = value[0]
      }
      if (isToken(value)) {
        const { image, startLine, startColumn, startOffset, endLine, endColumn, endOffset } = value
        return new Value(
          image,
          {},
          {
            startLine,
            startColumn,
            startOffset,
            endLine,
            endColumn,
            endOffset
          }
        )
      } else {
        return super.visit(value)
      }
    }

    /**
     * Visits an array of productions, returning Less Nodes
     */
    visitArray(
      nodes: (CstNode | IToken)[],
      {
        pre,
        preOffset = 1
      }: {
        pre?: IToken[]
        preOffset?: number
      } = {}
    ): any[] {
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

      if (ctx.pre) {
        const pre = <Node[]>processWS(ctx.pre, true)
        if (!rule) {
          return pre
        }
        rule.pre = new Expression({ nodes: pre })
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
      const { nodes, location } = spanNodes(selectors)

      return new List(nodes, {}, location)
    }

    complexSelector(ctx: any) {
      const selectors = this.visitArray(ctx.selector)
      const { nodes, location } = spanNodes(selectors)

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
      const { image, ...location } = collapseTokens(ctx.name)
      return new Value(image, {}, location)
    }

    expressionList(ctx: any) {
      const expressions = this.visitArray(ctx.expression)
      if (expressions.length === 1) {
        return expressions[0]
      }
      return new List(expressions)
    }

    expression(ctx: any) {
      const pre = ctx.pre ? <Node>processWS(ctx.pre) : ''
      const values: any[] = this.visitArray(ctx.value)
      const nodes = flatten(values)

      return new Expression({ pre, nodes })
    }

    addition(ctx: {
      lhs?: CstNode[]
      additionRhs?: CstNode[]
    }) {
      const mult = this.visit(ctx.lhs)
      if (!ctx.additionRhs) {
        return mult
      }
      let [ lhs, pre ] = mult
      let node: Node
      let rhs: any
      ctx.additionRhs.forEach((cstNode, i) => {
        const [ op, post, mult ] = this.visit(cstNode)

        if (pre) {
          op.pre = pre
        }
        if (post) {
          op.post = post
        }
        rhs = mult[0]
        pre = mult[1]

        lhs = new Operation([lhs, op, rhs])
      })
      return pre ? [ lhs, pre ] : [ lhs ]
    }

    additionRhs(ctx: any) {
      return [
        new Op(ctx.op[0].image),
        processWS(ctx.post),
        this.visit(ctx.rhs)
      ]
    }

    multiplication(ctx: any) {
      if (!ctx.rhs) {
        const node = this.visit(ctx.lhs)
        if (ctx.pre) {
          return [node, processWS(ctx.pre)]
        }
        return [node]
      }
    }

    value(ctx: any) {
      if (ctx.Ident) {
        return colorFromKeyword(ctx.Ident[0].image)
      } else if (ctx.Number) {
        const text = ctx.Number[0].image
        return new Num({ text, value: parseFloat(text) })
      }
      return {}
    }

    curlyBlock(ctx: any) {
      const L = ctx.L[0]
      const R = ctx.R[0]
      const { startLine, startColumn, startOffset } = L
      const { endLine, endColumn, endOffset } = R
      const nodes = this.visit(ctx.blockBody)

      return new Rules(
        { nodes, pre: L.image, post: R.image },
        {},
        {
          startLine,
          startColumn,
          startOffset,
          endLine,
          endColumn,
          endOffset
        }
      )
    }

    blockBody(ctx: any) {
      return this.visit(ctx.primary)
    }
  })()
}
