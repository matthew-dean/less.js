import { Context, Node, Rules, IBaseProps, IProps, INodeOptions, ILocationInfo } from '.'

export type IAtRuleProps = {
  name: string
  /** Prelude (everything after name and before ; or {) */
  prelude: Node
  /** Optional set of rules */
  rules?: Rules
} & IBaseProps

export class AtRule extends Node {
  name: string
  prelude: Node
  rules: Rules | undefined
  options: { atRoot?: boolean }

  constructor(props: IAtRuleProps, options: INodeOptions = {}, location: ILocationInfo) {
    const { name, ...rest } = props

    if (options.atRoot === undefined && /@media|@supports/i.test(name)) {
      options.atRoot = true
    }

    /** Wrap at rule body in an empty rules for proper scoping and collapsing */
    super(<IProps>(rest as unknown), options, location)
    this.name = name
  }

  toString(omitPrePost?: boolean) {
    let text = this.name + this.prelude.toString()
    if (this.rules) {
      text += this.rules.toString()
    }
    if (omitPrePost) {
      return text
    }
    return this.pre + text + this.post
  }

  eval(context: Context) {
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
AtRule.prototype.evalFirst = true
AtRule.prototype.allowRoot = true
