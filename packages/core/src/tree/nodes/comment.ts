import { Node, IProps, INodeOptions, ILocationInfo } from '.'

export type ICommentOptions = {
  isLineComment: boolean
}

export class Comment extends Node {
  text: string
  options: ICommentOptions

  constructor(props: string | IProps, options?: ICommentOptions, location?: ILocationInfo) {
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
