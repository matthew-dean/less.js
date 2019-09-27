import {
  Node,
  Rules,
  IBaseProps,
  IProps,
  ILocationInfo
} from '.'

import { EvalContext } from '../contexts'

export type IAtRuleProps = {
  name: string
  /** Prelude (everything after name and before ; or {) */
  prelude: Node[]
  /** Optional set of rules */
  rules?: Rules[]
} & IBaseProps

export type IAtRuleOptions = {
  /**
   * For cases like @media and @supports,
   * this option will bubble the rule to the root.
   * 
   * If two media of the same type are nested, their expression
   * lists (prelude) will be merged with 'and'
   */
  bubbleRule?: boolean
}

export class AtRule extends Node {
  name: string
  rules: Rules[]
  prelude: Node[]
  options: IAtRuleOptions

  constructor(props: IAtRuleProps, options: IAtRuleOptions, location: ILocationInfo) {
    const { name, ...rest } = props
    if (options.bubbleRule === undefined && (/@media|@supports/i.test(name))) {
      options.bubbleRule = true
    }
    
    /** Wrap at rule body in an empty rules for proper scoping and collapsing */
    super(<IProps>(rest as unknown), options, location)
    this.name = name
    this.allowRoot = true
  }

  toString(omitPrePost?: boolean) {
    let text = this.name + this.prelude.join('')
    if (this.rules) {
      text += this.rules.join('')
    }
    if (omitPrePost) {
      return text
    }
    return this.pre + text + this.post
  }

  eval(context: EvalContext) {
    let mediaPathBackup
    let mediaBlocksBackup

    /** @todo - What is mediaPath and mediaBlocks? */
    // media stored inside other atrule should not bubble over it
    // backpup media bubbling information
    mediaPathBackup = context.mediaPath
    mediaBlocksBackup = context.mediaBlocks
    // deleted media bubbling information
    context.mediaPath = []
    context.mediaBlocks = []

    super.eval(context)

    // restore media bubbling information
    context.mediaPath = mediaPathBackup
    context.mediaBlocks = mediaBlocksBackup

    return this
  }
}

AtRule.prototype.type = 'AtRule'
