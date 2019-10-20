import {
  Node,
  List,
  Expression,
  Rules,
  ProcessFunction,
  IProps,
  ILocationInfo,
  ImportantNode,
  Value
} from '.'

import { Context } from '../context'

/**
 * Will merge props using space or comma separators
 */
export enum MergeType {
  SPACED = 1,
  COMMA = 2
}

export type IDeclarationOptions = {
  isVariable?: boolean
  mergeType?: MergeType
}

export type IDeclarationProps = IProps & {
  name: string | Node[]
}

export class Declaration extends Node implements ImportantNode {
  value: string
  evaluatingName: boolean
  /**
   * For cross-platform compatability, a variable declaration's name
   * will not contain '@', but is instead marked as `isVariable: true`
   */
  name: Node[]
  /**
   * Declaration's value, will be a single node,
   * either a List (of Expressions), an Expression, or Rules
   * 
   * Note that a custom property's value will be a Expression containing
   * just Value nodes and any interpolated Variables, since it can contain
   * nearly anything. This Expression will contain initial
   * and final whitespace, whereas a normal declaration's expression (or list)
   * will have it assigned to the pre / post properties. This aligns with
   * the CSS syntax spec, and means that the nodes' value of `--foo: bar`
   * does _not_ equal the value of `--foo:bar`, but values within the 
   * declarations of `foo: bar` and `foo:bar` are equal.
   */
  nodes: [List<Node> | Node]
  important: [Value]

  options: IDeclarationOptions

  constructor(props: IDeclarationProps, options: IDeclarationOptions = {}, location?: ILocationInfo) {
    let { name, important } = props
    if (name.constructor === String) {
      if ((<string>name).charAt(0) === '@') {
        name = (<string>name).slice(1)
        options.isVariable = true
      }
      props.name = [new Value(name)]
    }
    if (!important) {
      props.important = []
    }
    super(props, options, location)
    if (name.constructor === String) {
      this.value = <string>name
    }
  }

  toString(omitPrePost?: boolean) {
    const text = (this.options.isVariable ? '@' : '') + 
      this.value + ':' + this.nodes.join('') + this.important.join('')
    
    if (omitPrePost) {
      return text
    }

    return this.pre + text + this.post
  }

  /** Resolve identifiers first */
  evalName(context: Context, evalFunc?: ProcessFunction) {
    let value = this.value
    if (!value) {
      if (this.evaluatingName) {
        return ''
      }
      /**
       * Don't look at (and try to eval) this declaration when resolving
       * a name that references a variable.
       */
      this.evaluatingName = true
      evalFunc = evalFunc || ((node: Node) => node.eval(context))
      this.processNodeArray(this.name, evalFunc)
      value = this.name.join('')
      this.value = value
      this.evaluatingName = false
    }
    return value
  }

  eval(context: Context) {
    if (!this.evaluated) {
      const evalFunc = (node: Node) => node.eval(context)
      this.evalName(context, evalFunc)
      context.importantScope.push({})
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
