import {
  Node,
  IProps,
  IBaseProps,
  INodeOptions,
  ILocationInfo,
  Value,
  Block,
  List,
  Expression,
  Selector,
  SelectorList
} from '.'

export type IElementProps = [string, string] | IProps
/**
 * An element's values list will be exactly two Values,
 * so that they can have normalized values for indexing / lookups
 */
export class Element extends Node {
  nodes: [Value, Node]

  constructor(props: IElementProps, options?: INodeOptions, location?: ILocationInfo) {
    let newProps: IProps = props
    if (Array.isArray(props)) {
      let nodes: Node[]
      if (props[0].constructor === String) {
        nodes = [new Value(<string>props[0]), new Value(<string>props[1])]
      } else {
        nodes = <Node[]>(<unknown>props)
      }
      newProps = { nodes }
    }

    super(newProps, options, location)
  }

  /**
   * Make sure an expression contains only elements (is a selector)
   */
  normalizeElementExpression(expr: Expression | Node): Selector {
    expr = expr.clone()
    if (!(expr instanceof Expression)) {
      expr = new Expression([expr]).inherit(expr)
    }
    const nodes = expr.nodes

    nodes.forEach((node, i) => {
      if (!(node instanceof Element)) {
        nodes[i] = new Element(['', node.toString()]).inherit(node)
      }
    })
    return <Selector>expr
  }

  /**
   * Make sure a list only contains element expressions
   */
  normalizeSelectorList(list: List): SelectorList {
    list = list.clone()
    const nodes = list.nodes
    nodes.forEach((expr, i) => {
      nodes[i] = this.normalizeElementExpression(expr)
    })
    return <SelectorList>list
  }

  eval(context: EvalContext) {
    if (!this.evaluated) {
      super.eval(context)
      /**
       * After elements are eval'd, one of the elements might have resolved to a selector
       * list (such as in the case of '&' or '@{var}'), so we need to normalize (flatten)
       * elements
       */
      const combinator = this.nodes[0]
      const element = this.nodes[1]
      if (!element) {
        return false
      }

      if (!(element instanceof Value)) {
        let list: SelectorList
        if (element instanceof List) {
          list = this.normalizeSelectorList(element)
        } else {
          list = new List<Selector>([this.normalizeElementExpression(element)]).inherit(element)
        }
        list.nodes.forEach((expr: Selector) => {
          const prevCombinator = expr.nodes[0].nodes[0]
          expr.nodes[0].nodes[0] = combinator.clone().inherit(prevCombinator)
        })
        if (list.nodes.length === 1) {
          return list.nodes[0]
        }
        return list
      }
    }
    return this
  }

  /** Indexable value */
  valueOf() {
    let combinator = (this.nodes[0].value || '').toString()
    let simpleSelector = (this.nodes[1].value || '').toString()
    return combinator + simpleSelector
  }
}

Element.prototype.type = 'Element'
