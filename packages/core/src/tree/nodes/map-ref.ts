import { Declaration } from '@less/core'
import { Context, Node, Name, Rules, RulesCall, Selector } from '.'

/**
 * References a value like .mixin()[$ref]
 *
 * Even though this references a variable (or property), it's not stored as a variable
 * reference. Otherwise it would be eval'd in this context.
 *
 * @todo - This should be a lot simpler now that rulesets and qualified rules
 *         have their rules collections normalized
 */
export class MapRef extends Node {
  /**
   * nodes[0] - the Node that, when evaluated, returns Rules
   * nodes[1] - the name of the lookup value
   */
  nodes: [Node, Node]

  eval(context: Context): Node {
    super.eval(context)

    const rules = this.nodes[0]
    if (!(rules instanceof Rules)) {
      return this.error(`${this.nodes[0].toString()} is not a valid rules call.`, context)
    }

    const name = this.nodes[1].toString()
    let decl: Declaration

    if (name === '') {
      decl = rules.lastDeclaration()
    } else if (name.charAt(0) === '@') {
      decl = rules.variable(name)

      if (!decl) {
        return this.error(`variable ${name} not found`, context)
      }
    } else {
      decl = rules.property(name)

      if (!decl) {
        return this.error(`property "${name}" not found`, context)
      }
    }

    return decl.eval(context).nodes[0]
  }
}

MapRef.prototype.type = 'MapRef'
