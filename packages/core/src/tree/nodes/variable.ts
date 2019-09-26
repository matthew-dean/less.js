import {
  Node,
  Declaration,
  IProps,
  ILocationInfo
  // FunctionCall
} from '.'

/**
 * @todo - Store the variable name without `@` for cross-format compatibility
 */
import { EvalContext } from '../contexts'

export type IVariableOptions = {
  /** will look up properties instead of variables */
  propertyRef?: boolean
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
  type: string
  value: string
  options: IVariableOptions

  constructor(props: string | IProps, options: IVariableOptions = {}, location?: ILocationInfo) {
    let newProps: IProps
    if (props.constructor === String) {
      newProps = { value: <string>props }
    } else {
      newProps = <IProps>props
    }
    let val: string = newProps.value.toString()
    
    if (options.propertyRef && newProps.value !== undefined && val.charAt(0) === '$') {
      newProps.value = val.slice(1)
    }
    super(newProps, options, location)
    this.type = options.propertyRef ? 'Property' : 'Variable'
  }

  toString() {
    const name = super.toString()
    if (this.options.propertyRef) {
      return name
    }
    return '@' + name
  }

  eval(context: EvalContext) {
    super.eval(context)
    if (!this.value) {
      this.value = this.nodes.join('')
    }
    const name = this.value
    const type = this.type


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
