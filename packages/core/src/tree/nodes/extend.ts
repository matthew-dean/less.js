import { Node, ILocationInfo, Selector, List, SelectorList } from '.'

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
 * @todo - Rework this...
 * 
 * Idea: make pseudo-selectors found during parsing, and matched
 *       during evaluation, map to a function
 * 
 *       e.g. `.a:extend(.b) {}` is a JS function like
 *            function extend(<Selector '.a'>, <Selector '.b'>) {
 *              this.selectorRegistry('.a').add('.b')
 *            }
 * 
 *       Then, when selectors are rendered, render according to the
 *       registry, not their values?
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
