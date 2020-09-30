import {
  Context,
  EvalReturn,
  Expression,
  Node,
  IProps,
  INodeOptions,
  ILocationInfo,
  NumericNode,
  Op
} from '.'
import { Operator } from '../../constants'

/**
 * Values can only be 3 Nodes
 *   e.g. [Node, Op, Node]
 *        [Operation, Op, Node]
 */
export class Operation extends Node {
  static operators: string[] = Object.values(Operator)
  /**
   * Represents lhs, op, rhs
   */
  nodes: [Node, Op, Node]

  constructor(props: [Node, Op, Node] | IProps, options?: INodeOptions, location?: ILocationInfo) {
    if (Array.isArray(props)) {
      props = { nodes: props }
    }
    super(props, options, location)
  }

  eval(context: Context): EvalReturn {
    super.eval(context)

    const nodes = this.nodes
    let a = nodes[0]
    let b = nodes[2]
    let op = nodes[1].value
    op = op === './' ? '/' : op

    if (context.isMathOn(op) && a instanceof NumericNode && b instanceof NumericNode) {
      if (Operation.operators.indexOf(op) === -1) {
        return this.error('Operation using invalid operator.', context)
      }
      return a.operate(<Operator>op, b, context).inherit(this)
    } else {
      /**
       * We'll output as-is, and warn about it, in case we want to use the text of the
       * expression somewhere else.
       */
      return this.warn('Operation on an invalid type', context)
    }
  }
}

Operation.prototype.type = 'Operation'
