import { Node, IProps, INodeOptions, ILocationInfo } from '.'

/**
 * This is a boolean keyword, which can be evaluated as true/false
 */
export class Bool extends Node {
  text: string
  value: boolean

  constructor (props: boolean | IProps, options?: INodeOptions, location?: ILocationInfo) {
    let newProps: IProps
    if (props.constructor === Boolean) {
      newProps = { value: <boolean>props }
    } else {
      newProps = <IProps>props
    }
    super(newProps, options, location)
  }
}

Bool.prototype.type = 'Bool'
