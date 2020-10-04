import { Node, ILocationInfo, IProps, INodeOptions } from '.'

export type IValueProps = string | IProps
/**
 * This is any generic (unquoted string fragment) value
 *   e.g. new Value('this is an unquoted value')
 *        new Value({ text: '[id=foo]', value: '[id="foo"]' }) */
/*
 * Renamed from 'Anonymous'
 */
export class Value extends Node {
  text: string
  value: string

  constructor(props: IValueProps, options?: INodeOptions, location?: ILocationInfo) {
    let returnProps: IProps
    if (props.constructor === String) {
      returnProps = <IProps>{ text: props, value: props.trim() }
    } else {
      returnProps = <IProps>props
      if (returnProps.value === undefined) {
        returnProps.value = returnProps.text
      }
    }
    super(returnProps, options, location)
    /** This never needs to be evaluated as it contains no nodes */
    this.evaluated = true
  }
}
Value.prototype.type = 'Value'
