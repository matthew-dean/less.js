import {
  NodeArray,
  Value,
  Node,
  Condition,
  Operation
} from '.'

import { EvalContext } from '../contexts'

/**
 * A () [] or {} block that holds an expression
 * Previously named 'Paren'
 * 
 * nodes will typically be [Value<'('>, Node, Value<')'>]
 * 
 * @todo - define nodes interface for constructor
 */
export class Block extends NodeArray {
  nodes: [Value, Node, Value]

  eval(context: EvalContext) {
    let content = this.nodes[1]
    let escape = content instanceof Operation || content instanceof Condition
    context.enterBlock()
    const block = super.eval(context)
    context.exitBlock()
    content = this.nodes[1]

    /** If the result of an operation or compare reduced to a single result, then return the result */
    if (escape && !(content instanceof Operation) && !(content instanceof Condition)) {
      return content
    }
    return block
  }
}
Block.prototype.type = 'Block'
