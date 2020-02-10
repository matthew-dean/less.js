import { Context, Expression, Node, IProps, INodeOptions, ILocationInfo, NumericNode, Op } from '.'

/**
 * Values can only be 3 Nodes
 *   e.g. [Node, Op, Node]
 *        [Operation, Op, Node]
 */
export class Operation extends Node {
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

  eval(context: Context) {
    super.eval(context)

    const nodes = this.nodes
    let a = nodes[0]
    let b = nodes[2]
    let op = nodes[1].value
    op = op === './' ? '/' : op

    if (context.isMathOn(op) && a instanceof NumericNode && b instanceof NumericNode) {
      return a.operate(op, b, context)
    } else {
      /**
       * We'll output as-is, and warn about it, in case we want to use the text of the
       * expression somewhere else.
       */
      this.warn(context, 'Operation on an invalid type')
      return new Expression(this.nodes).inherit(this)
    }
  }
}

Operation.prototype.type = 'Operation'
