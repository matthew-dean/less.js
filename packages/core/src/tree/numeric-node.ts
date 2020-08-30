import { Node } from './nodes'
import { Context } from './context'
import { Operator } from '../constants'

/**
 * Numeric nodes can be used in math expressions
 */
export abstract class NumericNode extends Node {
  abstract operate(op: Operator, other: Node, context?: Context): Node
}
