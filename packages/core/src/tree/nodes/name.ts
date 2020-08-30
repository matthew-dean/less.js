import { Context, Node, NodeArray, IProps, ILocationInfo } from '.'

export type INameOptions = {
  /** Name of a variable (v. a property) */
  isVariable?: boolean
  /** `@rest...` */
  variadic?: boolean
}

/**
 * This is an abstracted node that is used in a few places
 *   1. As the left-hand portion of an assignment
 *        e.g. `foo` in `foo: bar` or `@foo` in `@foo: bar`
 *   2. As the identifier in a mixin definition
 *        e.g. `@param` or `@rest` in `.mixin(@param, @rest...)`
 *   3. As the value in a lookup
 *        e.g. `@lookup` in `.rules[@lookup]`
 *
 * The reason for this abstraction is to make evaluation easier,
 * so that there's not logic to distinguish between variables
 * as identifiers and variables that should be eval'd as values.
 */
export class Name extends NodeArray {
  name: Name
  value: string
  evaluating: boolean
  options: INameOptions

  constructor(props: Node[] | IProps, options?: INameOptions, location?: ILocationInfo) {
    super(props, options, location)
    /** Convenience assignment for mixin params, so that it can just check for .name */
    this.name = this
  }

  eval(context: Context) {
    let value = this.value
    if (!this.evaluated) {
      if (this.evaluating) {
        this.value = ''
        return this
      }
      /**
       * Don't look at (and try to eval) this declaration when resolving
       * a name that references a variable.
       */
      this.evaluating = true
      this.processNodes(this.nodes, (node: Node) => node.eval(context))
      value = this.nodes.join('')
      this.value = value
      this.evaluating = false
      this.evaluated = true
    }
    return this
  }
}
