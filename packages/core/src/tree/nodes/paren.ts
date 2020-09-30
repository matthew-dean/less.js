import {
  Context,
  EvalReturn,
  NodeArray,
  IProps,
  Node,
  Condition,
  Operation,
  ILocationInfo
} from '.'

export type IParenOptions = {
  negate: boolean
}

/**
 * A () block that holds a Node
 * Can be assigned a negative operator
 */
export class Paren extends NodeArray {
  nodes: [Node]
  options: IParenOptions

  constructor(props: IProps, options?: IParenOptions, location?: ILocationInfo) {
    super(props, options, location)
  }

  eval(context: Context): EvalReturn {
    if (!this.evaluated) {
      let content = this.nodes[0]
      let escape = content instanceof Operation || content instanceof Condition
      context.enterParens()
      const block = super.eval(context)
      context.exitParens()
      content = this.nodes[0]

      /**
       * If the result of an operation or compare reduced to a single result,
       * then return the result (remove parens)
       */
      if (escape && block instanceof Node) {
        let content = block.nodes[0]
        if (!(content instanceof Operation) && !(content instanceof Condition)) {
          return content.inherit(this)
        }
      }
      return block
    }
    return this
  }

  toString(omitPrePost: boolean) {
    let text = this.options.negate ? '-' : ''
    text += '(' + this.nodes[0].toString() + ')'
    if (omitPrePost) {
      return text
    }
    return `${this.pre}${text}${this.post}`
  }
}
Paren.prototype.type = 'Paren'
