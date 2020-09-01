import { Context, EvalReturn, NodeArray, Value, Node, Condition, Operation } from '.'

/**
 * A () block that holds a Node
 */
export class Paren extends NodeArray {
  nodes: [Node]

  eval(context: Context): EvalReturn {
    if (!this.evaluated) {
      let content = this.nodes[0]
      let escape = content instanceof Operation || content instanceof Condition
      context.enterParens()
      const block = super.eval(context)
      context.exitParens()
      content = this.nodes[0]

      /**
       * If the result of an operation or compare reduced to a single result,
       * then return the result (remove block marker)
       */
      if (escape && block instanceof Node) {
        let content = block.nodes[0]
        if (!(content instanceof Operation) && !(content instanceof Condition)) {
          return content
        }
      }
      return block
    }
    return this
  }

  toString() {
    return '(' + this.nodes[0].toString() + ')'
  }
}
Paren.prototype.type = 'Paren'
