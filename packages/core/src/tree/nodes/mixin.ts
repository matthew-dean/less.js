import {
  Node,
  NodeArray,
  MixinDefinition,
  ImportantNode
} from '.'

/**
 * @todo - Store the mixin name without '.' or '#' for cross-format compatibility
 *         This makes .mixin() {} the equivalent of `@mixin mixin()`
 *         and .mixin(); is the equivalent of `@include mixin()`
 */
export class Mixin extends NodeArray implements ImportantNode {
  /**
   * First node is the mixin name, second is the definition
   */
  nodes: [Node, MixinDefinition]

  makeImportant() {
    const mixin = this.clone(true)
    mixin.nodes[1] = mixin.nodes[1].makeImportant()
    return mixin
  }
}

Mixin.prototype.type = 'Mixin'
Mixin.prototype.evalFirst = true
