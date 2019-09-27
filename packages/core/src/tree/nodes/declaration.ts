import {
  Node,
  List,
  Expression,
  Rules,
  IProps,
  ILocationInfo,
  ImportantNode,
  Value
} from '.'

import { EvalContext } from '../contexts'

/**
 * Will merge props using space or comma separators
 */
export enum MergeType {
  SPACED,
  COMMA
}

export type IDeclarationOptions = {
  isVariable?: boolean
  mergeType?: MergeType
}

export class Declaration extends Node implements ImportantNode {
  value: string
  /**
   * For cross-platform compatability, a variable declaration's name
   * will not contain '@', but is instead marked as `isVariable: true`
   */
  name: Node[]
  /**
   * Declaration's value, will be a single node,
   * either a List (of Expressions), an Expression, or Rules
   * 
   * Note that a custom property's expression will _contain_ initial
   * and final whitespace, whereas a normal declaration's expression (or list)
   * will have it assigned to the pre / post properties. This aligns with
   * the CSS syntax spec, and means that the nodes' value of `--foo: bar`
   * does _not_ equal the value of `--foo:bar`, but values of `foo: bar`
   * and `foo:bar` are equal.
   */
  nodes: [List<Node> | Node]
  important: [Value]

  options: IDeclarationOptions

  constructor(props: IProps, options?: IDeclarationOptions, location?: ILocationInfo) {
    const { important } = props
    if (!important) {
      props.important = []
    }
    super(props, options, location)
  }

  toString(omitPrePost?: boolean) {
    const text = (this.options.isVariable ? '@' : '') + 
      this.value + ':' + this.nodes.join('') + this.important.join('')
    
    if (omitPrePost) {
      return text
    }

    return this.pre + text + this.post
  }

  eval(context: EvalContext) {
    if (!this.evaluated) {
      const evalFunc = (node: Node) => node.eval(context)
      context.importantScope.push({})
      this.processNodeArray(this.name, evalFunc)
      this.value = this.name.join('')
      this.processNodeArray(this.nodes, evalFunc)
      this.processNodeArray(this.important, evalFunc)

      this.evaluated = true

      let important = this.important[0]
      const importantResult = context.importantScope.pop()
      if (!important && importantResult.important) {
        this.important = [new Value(importantResult.important)]
      }
    }

    return this
  }

  makeImportant() {
    this.important = [new Value({ pre: ' ', text: '!important' })]
    return this
  }
}

Declaration.prototype.type = 'Declaration'
