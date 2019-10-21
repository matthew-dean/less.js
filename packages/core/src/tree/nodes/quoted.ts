import {
  Context,
  NodeArray,
  IProps,
  ILocationInfo,
  Value
} from '.'

export type IQuotedOptions = {
  escaped?: boolean
  quote: string
}
/**
 * There's nothing special about a quoted node, other than
 * the first and last member will contain quote marks
 *   e.g. <Quoted <Value ">, <Value foo>, <Value ">>
 * 
 * If interpolated vars are present, the middle value will be an expression, as in:
 *   e.g. <Quoted <Value ">, <Expression <Value foo>, <Variable @bar>>, <Value "> >
 * 
 *   1) it may contain interpolated vars
 *   2) we can do normalized equality checks with the "inner" nodes
 */
export class Quoted extends NodeArray {
  options: IQuotedOptions
  value: string

  constructor(props: string | IProps, options: IQuotedOptions = { quote: '"' }, location?: ILocationInfo) {
    if (options.escaped === undefined) {
      options.escaped = false
    }
    let newProps: IProps
    if (props.constructor === String) {
      newProps = [new Value(<string>props)]
    } else {
      newProps = <IProps>props
    }

    super(newProps, options, location)
    this.allowRoot = options.escaped
  }

  eval(context: Context) {
    if (!this.evaluated) {
      super.eval(context)
      const node = this.clone()
      node.value = this.nodes.join('')
      if (!this.options.escaped) {
        this.nodes.unshift(new Value(this.options.quote))
        this.nodes.push(new Value(this.options.quote))
      }
      return node
    }
    return this
  }
}

Quoted.prototype.type = 'Quoted'
