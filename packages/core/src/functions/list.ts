import {
  Comment,
  Dimension,
  Declaration,
  Expression,
  Rules,
  Node,
  Num,
  Selector,
  // Element,
  // Mixin,
  Quoted,
  WS
} from '../tree/nodes'

import { define } from './helpers'

export const _SELF = define(function (n: Node) {
  return n
}, [Node])
export const extract = define(function (value: Node, index: Num) {
  // (1-based index)
  let i = index.value - 1

  return value.toArray()[i]
}, [Node], [Num])

export const length = define(function (value: Node) {
  return new Num(value.toArray().length)
}, [Node])

/**
 * Creates a Less list of incremental values.
 * Modeled after Lodash's range function, also exists natively in PHP
 *
 * @param start
 * @param end  - e.g. 10 or 10px - unit is added to output
 * @param step
 */
export const range = define(function (start: Num | Dimension, end: Num | Dimension, step: Num) {
  let from: number
  let to: Node
  let stepValue = 1
  const list = []
  if (end) {
    to = end
    from = start.value
    if (step) {
      stepValue = step.value
    }
  } else {
    from = 1
    to = start
  }
  let unit: string
  if (to instanceof Dimension) {
    unit = to.nodes[1].value
  }
  const listValue = unit
    ? (val: number) => new Dimension([val, unit])
    : (val: number) => new Num(val)

  for (let i = from; i <= to.value; i += stepValue) {
    list.push(listValue(i))
    list.push(new WS())
  }
  if (list.length > 1) {
    list.pop()
  }

  return new Expression(list)
}, [Num, Dimension], [Num, Dimension], [Num])

export const each = define(function (list: Node, mixin: MixinDefinition) {
  const iterator = list.toArray()
  let rs: Rules
  let newRules: Rules
  const returnRules: Rules[] = []

  let valueName = '@value'
  let keyName = '@key'
  let indexName = '@index'

  if (mixin.params) {
    valueName = mixin.params[0] && mixin.params[0].name.value
    keyName = mixin.params[1] && mixin.params[1].name.value
    indexName = mixin.params[2] && mixin.params[2].name.value
    rs = mixin.rules
  }

  for (let i = 0; i < iterator.length; i++) {
    let key: Node
    let value: Node
    const item = iterator[i]
    if (item instanceof Declaration) {
      key = item.name.clone()
      value = item.nodes[0]
    } else {
      key = new Num(i + 1)
      value = item
    }

    if (item instanceof Comment) {
      continue
    }

    newRules = rs.clone()

    if (valueName) {
      newRules.appendRule(new Declaration({ name: valueName, nodes: [value] }))
    }

    if (indexName) {
      newRules.appendRule(new Declaration({ name: indexName, nodes: [new Num(i + 1)] }))
    }

    if (keyName) {
      newRules.appendRule(new Declaration({ name: keyName, nodes: [key] }))
    }

    returnRules.push(newRules)
  }

  return new Rules(newRules).eval(this)
}, [Node], [MixinDefinition])
