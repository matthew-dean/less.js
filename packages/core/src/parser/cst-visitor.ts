import { CstChild } from '@less/css-parser'
import { isToken } from './util'
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
export class CstVisitor {
  [k: string]: any

  visit(ctx: CstChild) {
    if (isToken(ctx)) {
      const {
        image,
        startLine,
        startColumn,
        startOffset,
        endLine,
        endColumn,
        endOffset
      } = ctx
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
    }
    const visit = this[ctx.name]
    return visit ? visit() : null
  }

  /** Start building AST */
  root(ctx: any) {
    const rules = this.visit(ctx.primary)
    return new Rules(rules)
  }
}

export default new CstVisitor()