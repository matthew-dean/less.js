import { Node } from '.'

/**
 * A null node. Used as a return value for collapsing trees.
 * This is done for simple stringification and evaluation.
 *
 * Essentially, the Less 4 tree must ONLY contain nodes (extended
 * from the node class), which greatly simplifies not only
 * reasoning about the tree, but in operations like toString().
 *
 * That is, a developer may stringify any node collection, and not
 * run into nodes that eval'd to a JS `null`, for example, which
 * has no toString() method, and evals `null + ''` as "null".
 */
export class Null extends Node {
  constructor() {
    super([])
  }
  valueOf() {
    return false
  }
  toString() {
    return ''
  }
}
Null.prototype.type = 'Null'
