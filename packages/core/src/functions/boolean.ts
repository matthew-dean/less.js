import { Bool, Node, Condition } from '../tree/nodes'
import { LessFunction } from '../types'

/**
 * An evaluated Condition returns a Bool
 */
export const boolean = function (condition: Bool) {
  return condition
} as LessFunction

export const If = function (condition: Condition, trueValue: Node, falseValue?: Node) {
  const result = condition.eval(this)
  return result.value ? trueValue.eval(this) : falseValue && falseValue.eval(this)
} as LessFunction

If.evalArgs = false
