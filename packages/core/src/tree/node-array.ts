import { Node, IProps, INodeOptions, ILocationInfo } from './nodes'

/**
 * Accepts an array as props to assign to the nodes prop
 */
export abstract class NodeArray extends Node {
  constructor(props: Node[] | IProps, options?: INodeOptions, location?: ILocationInfo) {
    let objectProps: IProps
    if (Array.isArray(props)) {
      objectProps = <IProps>{ nodes: props }
    } else {
      objectProps = <IProps>props
    }
    super(objectProps, options, location)
  }
}
