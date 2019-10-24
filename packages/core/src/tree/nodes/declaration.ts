import {
  Context,
  Node,
  List,
  Name,
  IProps,
  ILocationInfo,
  ImportantNode,
  Value
} from '.'

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
  name: string | Name
}

export class Declaration extends Node implements ImportantNode {
  value: string
  evaluatingName: boolean
  /**
   * Declaration's nodes are are an array of [Value, Important],
   * The value is either a List (of Expressions), an Expression, or
   * Rules (an anonymous mixin definition)
   * 
   * Note that a custom property's value will be a Expression containing
   * just Value nodes and any interpolated Variables, since it can contain
   * nearly anything. This Expression will contain initial
   * and final whitespace, whereas a normal declaration's expression (or list)
   * will have it assigned to the pre / post properties. This aligns with
   * the CSS syntax spec, and means that the nodes' value of `--foo: bar`
   * does _not_ equal the value of `--foo:bar`, but values within the 
   * declarations of `foo: bar` and `foo:bar` are equal.
   * 
   */
  nodes: [(List<Node> | Node)] | [(List<Node> | Node), Value]
  name: Name
  options: IDeclarationOptions

  constructor(props: IDeclarationProps, options: IDeclarationOptions = {}, location?: ILocationInfo) {
    let { name } = props
    if (name.constructor === String) {
      if ((<string>name).charAt(0) === '@') {
        name = (<string>name).slice(1)
        options.isVariable = true
      }
      props.name = new Name([new Value(name)], { isVariable: !!options.isVariable })
    }
    super(props, options, location)
    if (name.constructor === String) {
      this.value = <string>name
    }
    this.evaluatingName = false
  }

  toString(omitPrePost?: boolean) {
    const text = (this.options.isVariable ? '@' : '') + 
      this.name.toString() + ':' + this.nodes.join('')
    
    if (omitPrePost) {
      return text
    }

    return this.pre + text + this.post
  }

  /** Resolve identifiers first */
  evalName(context: Context): string {
    let value = this.value
    if (value === undefined) {
      const name = this.name
      name.eval(context)
      value = name.value
      this.value = value
    }
    return value
  }

  eval(context: Context) {
    if (!this.evaluated) {
      context.importantScope.push({})
      this.processNodeArray(this.nodes, (node: Node) => node.eval(context))

      this.evaluated = true

      let important = this.nodes[1]
      const importantResult = context.importantScope.pop()
      if (!important && importantResult.important) {
        this.nodes[1] = new Value(importantResult.important)
      }
    }

    return this
  }

  makeImportant() {
    this.nodes[1] = new Value({ pre: ' ', text: '!important' })
    return this
  }
}

Declaration.prototype.type = 'Declaration'
