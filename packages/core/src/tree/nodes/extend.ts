import {
  Node,
  ILocationInfo,
  Selector,
  List
} from '.'
import { SelectorList } from '../node'

export enum ExtendMode {
  ALL
}

export type IExtendProps = {
  selectors: Selector[] | [SelectorList]
}

export type IExtendOptions = {
  mode: ExtendMode
}

/**
 * @todo - the extend visitor should run after tree flattening
 */
export class Extend extends Node {
  options: IExtendOptions
  constructor(props: IExtendProps, options: IExtendOptions, location: ILocationInfo) {
    const { selectors } = props
    if (selectors.length !== 1) {
      props.selectors = [new List<Selector>(selectors)]
    }
    super(props, options, location)
  }
}

Extend.prototype.type = 'Extend'
