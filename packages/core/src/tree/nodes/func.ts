import {
  Node,
  IProps,
  INodeOptions,
  ILocationInfo,
  Rules,
  Value
} from '.'
import { EvalContext } from '../contexts'

export type IFuncProps = {
  name: string
  /**
   * 
   */
  jsFunction?: Function
} & IProps

/**
 * This is a class abstraction for functions added by JS, but can also be
 * added as nodes by plugins or other extensions of the Less AST
 * 
 * This can be set up to return eval'd rules like a mixin, or will return the result
 * of a bound JS function.
 */
export class Func extends Node {
  name: string
  jsFunction: Function | undefined
  /** This can be specified as a lookup value */
  returnName: [Node]
  args: Node[]
  rules: [Rules] | undefined

  constructor(props: IFuncProps, options?: INodeOptions, location?: ILocationInfo) {
    const { name, jsFunction, ...rest } = props
    super(rest, options, location)
    this.name = name
    this.jsFunction = jsFunction
  }
}
Func.prototype.type = 'Func'