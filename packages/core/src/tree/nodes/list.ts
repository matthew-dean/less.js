import {
  Node,
  NodeArray,
  IProps,
  INodeOptions,
  ILocationInfo
} from '.'

export type NodeType<T> = T extends Node ? T : never
/**
 * Renamed from 'Value'
 * 
 * This is a any comma-separated list
 */
export class List<T = Node> extends NodeArray {
  nodes: NodeType<T>[]

  toString() {
    return this.nodes.join(',')
  }
}
List.prototype.type = 'List'
