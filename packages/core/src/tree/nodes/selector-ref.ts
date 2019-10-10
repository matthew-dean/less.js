import { Node } from '.'
import { Context } from '../context'

/**
 * The Ampersand ('&')
 */
export class SelectorRef extends Node {
  eval(context: Context) {
    return context.selectors[0].clone().inherit(this)
  }
}
SelectorRef.prototype.type = 'SelectorRef'
