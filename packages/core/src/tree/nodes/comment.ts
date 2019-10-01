import {
  Node,
  IProps,
  INodeOptions,
  ILocationInfo
} from '.'

export class Comment extends Node {
  text: string
  options: {
    isLineComment: boolean
  }
  constructor(props: string | IProps, options: INodeOptions, location: ILocationInfo) {
    let newProps: IProps
    if (props.constructor === String) {
      newProps = { text: <string>props, value: '' }
    } else {
      newProps = <IProps>props
    }
    super(newProps, options, location)
  }
}
Comment.prototype.type = 'Comment'
