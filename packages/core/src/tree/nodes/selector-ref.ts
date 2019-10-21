import { Context, Node } from '.'

/**
 * The Ampersand ('&')
 */
export class SelectorRef extends Node {
  eval(context: Context) {
    return context.selectors[0].clone().inherit(this)
  }
}
SelectorRef.prototype.type = 'SelectorRef'
