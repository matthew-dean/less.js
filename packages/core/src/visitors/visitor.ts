import * as tree from '../tree/nodes'

const _noop = (node: tree.Node) => node

abstract class Visitor {
  // Deprecated
  isPreEvalVisitor: boolean
  /**
   * Priority guide:
   *   1: Tree is first cloned for pre-evaluation
   *      (any mutations will be on the cloned copy that eval will receive)
   *   50: Import resolution
   *   100: Tree evaluation runs
   *   200: Selectors joined on rulesets (but tree is not flattened)
   *   300: Node visibility resolved
   *   400: Tree flattening
   *   500: Extend visitor
   */
  priority: number
  isReplacing: boolean
  visitArgs = { visitDeeper: true }

  /** Must implement a run() method */
  abstract run(node: tree.Node): void

  protected visit(node: tree.Node) {
    const Node = tree.Node
    if (!node) {
      return node
    }

    const type = node.type

    let func = this[`visit${type}`]
    let funcOut = this[`visit${type}Out`]

    const visitArgs = this.visitArgs
    visitArgs.visitDeeper = true

    if (func !== _noop) {
      const newNode = func(node, visitArgs)
      if (newNode && this.isReplacing) {
        node = newNode
      }
    }

    if (visitArgs.visitDeeper && node instanceof Node) {
      node.accept(this)
    }

    if (funcOut !== _noop) {
      funcOut(node)
    }

    return node
  }
}

/**
 * Set up default methods on the Visitor prototype
 *   e.g. `visitRules()` / `visitRulesOut()`
 */
for (let n in tree) {
  const node = tree[n]
  if (node instanceof tree.Node) {
    Visitor.prototype[`visit${node.type}`] = _noop
  }
}

export default Visitor
