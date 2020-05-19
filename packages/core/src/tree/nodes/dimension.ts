import { Context, Node, IProps, INodeOptions, ILocationInfo, NumericNode, Num, Value } from '.'

import { convertDimension } from '../util/convert'
import { operate } from '../util/math'
import { StrictUnitMode, Operator } from '../../constants'

export type IDimensionProps = [number | Num, string | Value] | IProps

/**
 * A number with a unit
 *
 * e.g. props = [<Num>, <Value>], or
 *      props = [1, 'px']
 */
export class Dimension extends NumericNode {
  value: number
  /** Second value is the unit */
  nodes: [Num, Value]

  constructor(props: IDimensionProps, options?: INodeOptions, location?: ILocationInfo) {
    let nodes = Array(2)

    if (Array.isArray(props)) {
      const val1 = props[0]
      const val2 = props[1]
      nodes[0] = val1.constructor === Number ? new Num(<number>val1) : <Num>val1
      nodes[1] = val2.constructor === String ? new Value(<string>val2) : <Value>val2
      props = { nodes }
    }
    super(props, options, location)
    /** Sets the value to the value of the Num */
    this.value = this.nodes[0].value
  }

  operate(op: Operator, other: Node, context: Context): Node {
    const strictUnits = context.options.strictUnits
    if (other instanceof Dimension) {
      const aUnit = this.nodes[1]
      const bNode = this.unify(other, aUnit.value)
      const bUnit = bNode.nodes[1]

      if (aUnit.value !== bUnit.value) {
        if (strictUnits === StrictUnitMode.ERROR) {
          return this.error(
            `Incompatible units. Change the units or use the unit function. `
              + `Bad units: '${aUnit.value}' and '${bUnit.value}'.`,
            context
          )
        } else if (strictUnits === StrictUnitMode.LOOSE) {
          /**
           * In an operation between two Dimensions,
           * we default to the first Dimension's unit,
           * so `1px + 2%` will yield `3px`.
           *
           * This can have un-intuitive behavior for a user,
           * so it is not a recommended setting.
           */
          const result = operate(op, this.value, bNode.value)
          return new Dimension([result, aUnit.clone()]).inherit(this)
        } else {
          return this.warn(`Incompatible units. Operation will be preserved.`, context)
        }
      } else {
        const result = operate(op, this.value, bNode.value)
        /** Dividing 8px / 1px will yield 8 */
        if (op === '/') {
          return new Num(result).inherit(this)
        } else if (op === '*') {
          return this.error(`Can't multiply a unit by a unit.`, context)
        }
        return new Dimension([result, aUnit.clone()]).inherit(this)
      }
    } else if (other instanceof Num) {
      const unit = this.nodes[1].clone()
      const result = operate(op, this.nodes[0].value, other.value)
      return new Dimension([result, unit.clone()]).inherit(this)
    }
    return this
  }

  unify(other: Dimension, unit: string) {
    const newDimension = convertDimension(other, unit)
    if (newDimension) {
      return newDimension
    }
    return other
  }
}

Dimension.prototype.type = 'Dimension'
