import { Context, Node, Variable, Rules, RulesCall, Selector } from '.'

/**
 * References a value like .mixin[$ref]
 *
 * Even though this references a variable (or property), it's not stored as a variable
 * reference. Otherwise it would be eval'd in this context.
 *
 * @todo - This should be a lot simpler now that rulesets and qualified rules
 *         have their rules collections normalized
 */
export class MapRef extends Node {
  nodes: [RulesCall, Variable]
  eval (context: Context) {
    this.nodes[0].eval(context)
    let i
    let j
    let name
    let rules = this.value.eval(context)

    for (i = 0; i < this.lookups.length; i++) {
      name = this.lookups[i]

      /**
       * Eval'd DRs return ruless.
       * Eval'd mixins return rules, so let's make a rules if we need it.
       * We need to do this because of late parsing of values
       */
      if (Array.isArray(rules)) {
        rules = new Rules([new Selector()], rules)
      }

      if (name === '') {
        rules = rules.lastDeclaration()
      } else if (name.charAt(0) === '@') {
        if (name.charAt(1) === '@') {
          name = `@${new Variable(name.substr(1)).eval(context).value}`
        }
        if (rules.variables) {
          rules = rules.variable(name)
        }

        if (!rules) {
          throw {
            type: 'Name',
            message: `variable ${name} not found`,
            filename: this.fileInfo().filename,
            index: this.getIndex()
          }
        }
      } else {
        if (name.substring(0, 2) === '$@') {
          name = `$${new Variable(name.substr(1)).eval(context).value}`
        } else {
          name = name.charAt(0) === '$' ? name : `$${name}`
        }
        if (rules.properties) {
          rules = rules.property(name)
        }

        if (!rules) {
          throw {
            type: 'Name',
            message: `property "${name.substr(1)}" not found`,
            filename: this.fileInfo().filename,
            index: this.getIndex()
          }
        }
        // Properties are an array of values, since a rules can have multiple props.
        // We pick the last one (the "cascaded" value)
        rules = rules[rules.length - 1]
      }

      if (rules.value) {
        rules = rules.eval(context).value
      }
      if (rules.rules) {
        rules = rules.rules.eval(context)
      }
    }
    return rules
  }
}

MapRef.prototype.type = 'MapRef'
