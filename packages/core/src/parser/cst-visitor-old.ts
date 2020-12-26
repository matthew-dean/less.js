import { IToken, CstNode, tokenMatcher } from 'chevrotain'
import { LessParser } from '@less/parser'
import {
  Node,
  Rule,
  Rules,
  Value,
  Expression,
  List,
  MergeType,
  Declaration,
  IDeclarationProps,
  Op,
  Num,
  Operation,
  Name,
  Paren,
  WS,
  Comment,
  Dimension,
  Color,
  Selector,
  RulesCall
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

    rule(ctx: {
      pre?: IToken[]
      atRule?: CstNode[]
      qualifiedRule?: CstNode[]
      declaration?: CstNode[]
    }) {
      let rule: any // Node
      if (ctx.atRule) {
        rule = this.visit(ctx.atRule)
      } else if (ctx.qualifiedRule) {
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

    atRule(ctx: { unknownAtRule?: CstNode[] }) {
      if (ctx.unknownAtRule) {
        return this.visit(ctx.unknownAtRule)
      }
    }

    unknownAtRule(ctx: {
      AtKeyword: IToken[]
      Colon?: IToken[]
      preExpr?: IToken[]
      expressionList?: CstNode[]
    }) {
      if (ctx.Colon) {
        /** This is a variable declaration */
        const expr: Node = this.visit(ctx.expressionList)
        expr.pre = <Node>processWS(ctx.preExpr)
        /** @todo - !important */
        return new Declaration({
          name: ctx.AtKeyword[0].image,
          nodes: [expr]
        })
      }
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

    declaration(ctx: {
      name: CstNode[]
      postName?: IToken[]
      op: IToken[]
      value: CstNode[]
      semi?: IToken[]
    }) {
      const name = new Name([this.visit(ctx.name)])
      if (ctx.postName) {
        name.post = <Node>processWS(ctx.postName)
      }
      const assignOp = ctx.op[0].tokenType.name
      let opts
      if (assignOp === 'PlusAssign') {
        opts = { mergeType: MergeType.COMMA }
      } else if (assignOp === 'UnderscoreAssign') {
        opts = { mergeType: MergeType.SPACED }
      }
      const nodes: [Node] = [this.visit(ctx.value)]
      const props: IDeclarationProps = { name, nodes }
      if (ctx.semi) {
        props.post = ';'
      }

      return new Declaration(props, opts)
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
      const nodes: Node[] = flatten(values)
      let post: Node | string = ''

      /** Attach white-space / comments to nodes */
      for (let i = 1; i < nodes.length; i++) {
        let node = nodes[i]
        if (node instanceof WS || node instanceof Comment || node instanceof Expression) {
          const nextNode = nodes[i + 1]
          if (nextNode) {
            nextNode.pre = node
          } else {
            post = node
          }
          nodes.splice(i--, 1)
        }
      }

      if (nodes.length === 1) {
        const node = nodes[0]
        node.pre = pre
        node.post = post
        return node
      }

      return new Expression({ pre, nodes, post })
    }

    addition(ctx: { lhs?: CstNode[]; additionRhs?: CstNode[] }) {
      const mult = this.visit(ctx.lhs)
      if (!ctx.additionRhs) {
        return mult
      }
      let [lhs, pre] = mult
      let rhs: any
      ctx.additionRhs.forEach((cstNode, i) => {
        const [op, post, mult] = this.visit(cstNode)

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
      return pre ? [lhs, pre] : [lhs]
    }

    additionRhs(ctx: any) {
      return [new Op(ctx.op[0].image), processWS(ctx.post), this.visit(ctx.rhs)]
    }

    multiplication(ctx: { lhs: CstNode[]; pre?: IToken[]; multiplicationRhs?: CstNode[] }) {
      let lhs = this.visit(ctx.lhs)
      let pre = ctx.pre && processWS(ctx.pre)
      if (!ctx.multiplicationRhs) {
        if (pre) {
          return [lhs, pre]
        }
        return [lhs]
      }

      ctx.multiplicationRhs.forEach((cstNode, i) => {
        const [op, post, rhs, nextPre] = this.visit(cstNode)

        if (pre) {
          op.pre = pre
        }
        if (post) {
          op.post = post
        }
        pre = nextPre
        lhs = new Operation([lhs, op, rhs])
      })

      return pre ? [lhs, pre] : [lhs]
    }

    multiplicationRhs(ctx: any) {
      return [new Op(ctx.op[0].image), processWS(ctx.post), this.visit(ctx.rhs), processWS(ctx.pre)]
    }

    value(ctx: {
      Ident?: IToken[]
      Dimension?: IToken[]
      Number?: IToken[]
      valueBlock?: CstNode[]
      variable?: CstNode[]
    }) {
      if (ctx.valueBlock) {
        return this.visit(ctx.valueBlock)
      } else if (ctx.Ident) {
        return colorFromKeyword(ctx.Ident[0].image)
      } else if (ctx.Number) {
        const text = ctx.Number[0].image
        return new Num({ text, value: parseFloat(text) })
      } else if (ctx.Dimension) {
        const dimension = ctx.Dimension[0].payload
        const text = dimension[0][0].value
        const unit = dimension[1][0].value
        return new Dimension([new Num({ text, value: parseFloat(text) }), new Value(unit)])
      } else if (ctx.variable) {
        return this.visit(ctx.variable)
      }
      return {}
    }

    valueBlock(ctx: {
      op?: IToken[]
      LParen?: IToken[]
      RParen?: IToken[]
      LSquare?: IToken[]
      RSquare?: IToken[]
      expressionList?: CstNode[]
      guardOr?: CstNode[]
    }) {
      if (ctx.LParen) {
        let opts = ctx.op && ctx.op[0].image === '-' && { negate: true }
        const nodes = ctx.expressionList
          ? [this.visit(ctx.expressionList)]
          : [this.visit(ctx.guardOr)]
        return new Paren({ nodes }, opts)
      } else {
        return new Expression([new Value('['), this.visit(ctx.expressionList), new Value(']')])
      }
    }

    /**
     * @todo - distinguish colors from selectors
     */
    variable(ctx: {
      Selector?: IToken[]
      LParen?: IToken[]
      RParen?: IToken[]
      LSquare?: IToken[]
      RSquare?: IToken[]
      mixinCallArgs?: CstNode[]
    }) {
      if (ctx.Selector) {
        if (!ctx.LParen && !ctx.LSquare) {
          /** Might be selector or color */
          if (ctx.Selector.length === 1 && tokenMatcher(ctx.Selector[0], parser.T.Color)) {
            return new Color(ctx.Selector[0].image)
          }
        }
        const nodes = ctx.Selector.map(token => new Value(token.image))
        const sel = nodes.length === 1 ? nodes[0] : new Expression(nodes)
        if (!ctx.LParen) {
          return sel
        }
        const args = this.visit(ctx.mixinCallArgs)
        const call = new RulesCall({ name: sel, args })
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
