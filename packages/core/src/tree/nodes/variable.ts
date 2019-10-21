import {
  Context,
  Node,
  Declaration,
  IProps,
  ILocationInfo
  // FunctionCall
} from '.'

import { mergeProperties } from '../util/selectors'

export type IVariableOptions = {
  /** will look up properties instead of variables */
  propertyRef?: boolean
}

/**
 * Note that this is, specifically, a variable/property reference,
 * and not an assignment to a variable identifier.
 *
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

  eval(context: Context) {
    super.eval(context)
    let name = this.value
    if (!name) {
      name = this.nodes.join('')
      this.value = name
    }
    const type = this.type

    if (this.evaluating) {
      return this.error(context,
        `Recursive ${type} reference for '${name}'`
      )
    }

    this.evaluating = true
    const decl: Declaration | Declaration[] = this[`find${type}`](context, name)
    this.evaluating = false

    if (decl) {
      if (Array.isArray(decl)) {
        let props: Declaration[] = []
        decl.forEach(node => {
          props.push(node.eval(context))
        })
        props = mergeProperties(props, true)
        /** @todo - merge props */
        return props[props.length - 1].nodes
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
