import { Context, NodeArray, IProps, ILocationInfo, Value } from '.'

export type IQuotedOptions = {
  escaped?: boolean
  quote: string
}
/**
 * This is a plain value wrapped in quote marks
 *   e.g. "foo" = <Quoted {quote: '"" } <Value foo>>
 *
 * If interpolated vars are present, the middle value will be an expression, as in:
 *   e.g. "foo@{bar}" = <Quoted {quote: '"" } <Expression <Value foo>, <Variable @bar>>>
 *
 *   This way, we can do normalized equality checks regardless of quote marks.
 */
export class Quoted extends NodeArray {
  options: IQuotedOptions
  value: string

  constructor(
    props: string | IProps,
    options: IQuotedOptions = { quote: '"' },
    location?: ILocationInfo
  ) {
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

  valueOf() {
    return this.nodes.join('')
  }

  toString(omitPrePost: boolean = false) {
    let text = ''
    if (!this.options.escaped) {
      text += this.options.quote
    }
    text += this.nodes.join('')
    if (!this.options.escaped) {
      text += this.options.quote
    }
    if (omitPrePost) {
      return text
    }
    return this.pre + text + this.post
  }
}

Quoted.prototype.type = 'Quoted'
