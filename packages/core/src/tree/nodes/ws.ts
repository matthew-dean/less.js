import { Node, IProps, INodeOptions, ILocationInfo } from '.'

/**
 * A white-space node
 * Used to normalize expressions and values for equality testing
 * and list indexing
 * 
 * @todo - is this needed?
 * 
 *   e.g. { value: ' ', text: ' //foo' }
 */
export class WS extends Node {
  constructor(text?: string | IProps, options?: INodeOptions, location?: ILocationInfo) {
    let props: IProps
    if (text.constructor === String) {
      if (!text || text === ' ') {
        props = { value: ' ' }
      } else {
        props = { value: ' ', text: <string>text }
      }
    } else {
      props = <IProps>text
    }
    super(props, options, location)
  }
}
WS.prototype.type = 'WS'
