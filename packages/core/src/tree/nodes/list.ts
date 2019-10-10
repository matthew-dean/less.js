import {
  Node,
  NodeArray,
  IProps,
  INodeOptions,
  ILocationInfo
} from '.'
import { Context } from '../context'

/**
 * Renamed from 'Value'
 * 
 * This is a any comma-separated list
 */
export class List<T extends Node = Node> extends NodeArray {
  nodes: T[]

  eval(context: Context): List<T> {
    return <List<T>>super.eval(context)
  }
  toString() {
    return this.nodes.join(',')
  }
}
List.prototype.type = 'List'
