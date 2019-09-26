import {
  Node,
  IProps,
  IBaseProps,
  INodeOptions,
  ILocationInfo,
  Value,
  Block
} from '.'

export type IElementProps = [string, string] | IProps
/**
 * An element's values list will be exactly two Values,
 * so that they can have normalized values for indexing / lookups
 */
export class Element extends Node {
  children: {
    nodes: [Value, Value]
  }

  constructor(props: IElementProps, options?: INodeOptions, location?: ILocationInfo) {
    let nodes: Node[]
    if (props[0].constructor === String) {
      nodes = [new Value(<string>props[0]), new Value(<string>props[1])]
    } else {
      nodes = <Node[]>((<IBaseProps>props).nodes || props)
    }
 
    super({ nodes }, options, location)
  }

  /** Indexable value */
  valueOf() {
    let combinator = (this.nodes[0].value || '').toString()
    let simpleSelector = (this.nodes[1].value || '').toString()
    return combinator + simpleSelector
  }

  toString() {
    return this.nodes[0].toString() + this.nodes[1].toString()
  }
}

Element.prototype.type = 'Element'
