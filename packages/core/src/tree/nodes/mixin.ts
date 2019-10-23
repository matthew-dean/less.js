import {
  Context,
  Node,
  Value,
  MixinDefinition,
  IMixinDefinitionProps,
  INodeOptions,
  ILocationInfo,
  ImportantNode
} from '.'

export type IMixinProps = IMixinDefinitionProps & {
  name: string | Node
}

/**
 * @todo - Store the mixin name without '.' or '#' for cross-format compatibility
 *         This makes .mixin() {} the equivalent of `@mixin mixin()`
 *         and .mixin(); is the equivalent of `@include mixin()`
 */
export class Mixin extends Node implements ImportantNode {
  /**
   * First node is the mixin name, second is the definition
   */
  nodes: [Node, MixinDefinition]
  value: string

  constructor(props: IMixinProps, options?: INodeOptions, location?: ILocationInfo) {
    const { name, rules, params, condition, ...rest } = props
    /** The mixin definition can be passed through the Mixin API */
    if (name && rules) {
      if (name.constructor === String) {
        rest.nodes = [new Value(name)]
      } else {
        rest.nodes = [<Node>name]
      }
      rest.nodes.push(new MixinDefinition({ rules, params, condition }))
    }
    super(rest, options, location)
  }

  eval(context: Context) {
    if (!this.evaluated) {
      super.eval(context)
      const name = this.nodes[0].toString().replace(/^[.#]/, '')
      this.value = name
    }
    return this
  }

  makeImportant() {
    const mixin = this.clone(true)
    mixin.nodes[1] = mixin.nodes[1].makeImportant()
    return mixin
  }
}

Mixin.prototype.type = 'Mixin'
Mixin.prototype.evalFirst = true
