import {
  Node,
  NodeArray,
  IProps,
  ILocationInfo,
  Op,
  Bool
} from '.'

import { Context } from '../context'
import { compare } from '../util/compare'

export type IConditionOptions = {
  negate: boolean
}

export class Condition extends NodeArray {
  /** [left, op, right] */
  nodes: [Node, Op, Node]
  options: IConditionOptions

  constructor(props: IProps, options?: IConditionOptions, location?: ILocationInfo) {
    super(props, options, location)
  }

  eval(context: Context): Bool {
    const result = ((op, a, b) => {
      if (a instanceof Node && b instanceof Node) {
        switch (op) {
          case 'and': return Boolean(a.valueOf()) && Boolean(b.valueOf())
          case 'or':  return Boolean(a.valueOf()) || Boolean(b.valueOf())
          default:
            switch (compare(a, b)) {
              case -1:
                return op === '<' || op === '=<' || op === '<='
              case 0:
                return op === '=' || op === '>=' || op === '=<' || op === '<='
              case 1:
                return op === '>' || op === '>='
              default:
                return new Bool({ value: false })
            }
        }
      } else {
        return new Bool({ value: false })
      }
    })(this.nodes[1].value, this.nodes[0].eval(context), this.nodes[2].eval(context))

    const value = this.options.negate ? !result : result
    return new Bool(<IProps>{ value })
  }
}

Condition.prototype.type = 'Condition'
