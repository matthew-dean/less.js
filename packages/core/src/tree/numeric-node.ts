import { Node } from './nodes'
import { Context } from './context'

/**
 * Numeric nodes can be used in math expressions
 */
export abstract class NumericNode extends Node {
  abstract operate(op: string, other: Node, context?: Context): Node
}