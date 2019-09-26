import {
  Node,
  Declaration,
  IProps,
  ILocationInfo,
  FunctionCall
} from '.'

/**
 * @todo - Store the variable name without `@` for cross-format compatibility
 */
import { EvalContext } from '../contexts'

export type IVariableOptions = {
  /** will look up properties instead of variables */
  propertyRef: boolean
}
/**
 * The value nodes might contain another variable ref (nested vars)
 * 
 * e.g. 
 *   nodes: @foo = <Value 'foo'>
 *   nodes: @@bar = <Variable 'bar'>
 */
export class Variable extends Node {
  evaluating: boolean
  name: string
  type: string

  options: IVariableOptions

  constructor(props: IProps, options: IVariableOptions, location: ILocationInfo) {
    super(props, options, location)
    this.type = options.propertyRef ? 'Property' : 'Variable'
  }

  toString() {
    const name = this.nodes.join('')
    if (this.options.propertyRef) {
      return name
    }
    return '@' + name
  }

  eval(context: EvalContext) {
    super.eval(context)

    let name = this.nodes.join('')
    this.name = name
    const type = this.type
    if (this.options.propertyRef && name.charAt(0) === '$') {
      name = name.slice(1)
    }

    if (this.evaluating) {
      return this.error(context,
        `Recursive ${type} reference for '${name}'`
      )
    }

    this.evaluating = true

    const decl: Declaration | Declaration[] = this[`find${type}`](name)
    if (decl) {
      this.evaluating = false
      if (Array.isArray(decl)) {
        const props = []
        decl.forEach(node => {
          props.push(node.eval(context))
        })
        /** @todo - merge props */
        return props
      } else {
        decl.eval(context)
        /** Return the evaluated declaration's value */
        return decl.nodes[0]
      }
      
    }
    return this.error(context, `${type} '${name}' is undefined`)

    // const variable = this.find(node => {
    //   const v = frame.variable(name)
    //   if (v) {
    //     if (v.important) {
    //       const importantScope = context.importantScope[context.importantScope.length - 1]
    //       importantScope.important = v.important
    //     }
    //     // If in calc, wrap vars in a function call to cascade evaluate args first
    //     if (context.inCalc) {
    //       return (new FunctionCall('_SELF', [v.value])).eval(context)
    //     }
    //     else {
    //       return v.value.eval(context)
    //     }
    //   }
    // })
  }
}

Variable.prototype.type = 'Variable'
