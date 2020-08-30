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
  definition?: MixinDefinition
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
  name: Node
  definition: MixinDefinition
  value: string

  constructor(props: IMixinProps, options?: INodeOptions, location?: ILocationInfo) {
    const { name } = props
    const { rules, params, condition, ...rest } = props
    /** The mixin definition can be passed through the Mixin API */
    if (name && rules) {
      if (name.constructor === String) {
        rest.name = new Value(name)
      }
      rest.definition = new MixinDefinition({ rules, params, condition })
    }
    super(rest, options, location)
    this.isVisible = false
  }

  eval(context: Context) {
    if (!this.evaluated) {
      super.eval(context)
      const name = this.name.toString().replace(/^[.#]/, '')
      this.value = name
    }
    return this
  }

  makeImportant() {
    const mixin = this.clone(true)
    mixin.nodes[1] = mixin.definition.makeImportant()
    return mixin
  }
}

Mixin.prototype.type = 'Mixin'
Mixin.prototype.evalFirst = true
