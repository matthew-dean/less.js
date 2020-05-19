import { CstNodeLocation } from 'chevrotain'
import { IOptions } from '../options'
import { Context } from './context'
import { compare } from './util/compare'
import { ImportRule, Declaration, Rules } from './nodes'

export type SimpleValue = string | number | boolean | number[] | undefined

export type IBaseProps = {
  /** Each node may have pre or post Nodes for comments or whitespace */
  pre?: Node | string
  post?: Node | string
  /**
   * Primitive or simple representation of value.
   * This is used in valueOf() for math operations,
   * and also in indexing and lookups for some nodes
   */
  value?: SimpleValue
  /**
   * The reason this exists in addition to value is that this is the
   * ACTUAL text representation of value
   *   e.g. 1) a color may have a value of [0, 0, 0, 1], but a text value of 'black'
   *        2) an element's simple selector may have a value of '[foo="bar"]',
   *           but a text value of '[foo=bar]' (for normalization)
   */
  text?: string

  /**
   * Most nodes will have a single sub-node collection under this property
   */
  nodes?: Node[]
}

export type IProps = {
  [P in keyof IBaseProps]: IBaseProps[P]
} & {
  [key: string]: any
}

/**
 * The result of an eval can be one of these types
 */
export type EvalReturn<T extends Node = Node> = T[] | T
export type ProcessFunction<T extends Node = Node> = (node: T) => EvalReturn<T>

// export type IProps = Node[] | (IChildren & ISimpleProps)
export interface ILocationInfo extends CstNodeLocation {}
/**
 * In practice, this will probably be inherited through the prototype chain
 * during creation.
 *
 * So the "own properties" should be CstNodeLocation info, but should do an
 * Object.create() from the location info of the stylesheet root location info
 */
export interface IFileInfo {
  filename: string
  path: string
}

export type INodeOptions = {
  atRoot?: boolean
  [key: string]: boolean | number | string | undefined
} & Partial<IFileInfo>

export enum MatchOption {
  /** Return first result */
  FIRST,

  /** Return all matches in the ruleset where the first match is found */
  ALL_RULES,

  /** Same as all rules, except does not search parent */
  IN_RULES,

  /** Return all matches found while searching up the tree */
  IN_SCOPE
}

type MatchFunction = (node: Node) => Node | undefined

export abstract class Node {
  /**
   * When nodes only have a single list of sub-nodes, they'll use the nodes prop,
   * which reduces boilerplate when used.
   *
   * This will always be present as an array, even if it is empty
   */
  nodes: Node[]
  pre: Node | string
  post: Node | string

  childKeys: string[]

  /** Used if string does not equal normalized primitive */
  value?: SimpleValue
  text?: string

  options: INodeOptions
  lessOptions: IOptions
  fileInfo: IFileInfo

  allowRoot: boolean

  /**
   * This will be the start values from the first token and the end
   * values from the last token, as well as file info
   */
  location?: ILocationInfo

  parent: Node
  root: Rules
  fileRoot: Rules

  children: { [key: string]: Node | Node[] }

  visibilityBlocks: number
  evalFirst: boolean

  // false - the node must not be visible
  // true - the node must be visible
  // undefined or null - the node has the same visibility as its parent
  // renamed from nodeVisible
  isVisible: boolean

  type: string

  /** eval() was called */
  evaluated: boolean
  access: number;

  /** Nodes are allowed to set arbitrary properties */
  [k: string]: any

  private static inheritanceKeys = [
    'pre',
    'post',
    'location',
    'parent',
    'root',
    'fileRoot',
    'fileInfo',
    'visibilityBlocks',
    'isVisible',
    'evaluated'
  ]

  private static nodeKeys = Node.inheritanceKeys.concat(['childKeys', 'value', 'text', 'options'])

  constructor(props: IProps, options: INodeOptions = {}, location?: ILocationInfo) {
    if (props instanceof Node) {
      throw { message: 'Node props cannot be a Node' }
    }
    const { pre, post, value, text, ...children } = props
    /** nodes is always present as an array, even if empty */

    const keys: string[] = []
    this.childKeys = keys

    /**
     * Normalize children collection
     */
    Object.entries(children).forEach(entry => {
      const key = entry[0]
      let val = entry[1]
      if (val !== undefined) {
        this[key] = val
        keys.push(key)
      }
    })

    if (keys.indexOf('nodes') === -1) {
      this.nodes = []
      keys.push('nodes')
    }

    Object.defineProperty(this, 'children', {
      get() {
        const children: { [key: string]: Node | Node[] } = {}
        this.childKeys.forEach((key: string) => {
          children[key] = this[key]
        })
        return children
      },
      configurable: false,
      enumerable: false
    })

    this.value = value
    this.text = text
    this.pre = pre || ''
    this.post = post || ''

    const nodeRefProps = {
      enumerable: false,
      configurable: false,
      writable: true
    }

    Object.defineProperties(this, {
      parent: nodeRefProps,
      root: nodeRefProps,
      fileRoot: nodeRefProps
    })

    this.setParent()
    this.location = location

    if (options.isRoot && this instanceof Rules) {
      this.root = this
    }
    if (options.filename && this instanceof Rules) {
      this.fileRoot = this
      this.fileInfo = <IFileInfo>options
    } else {
      this.options = options
    }

    this.evaluated = false
    this.visibilityBlocks = 0
  }

  protected setParent() {
    this.childKeys.forEach(key => {
      let nodes = this[key]
      if (!Array.isArray(nodes)) {
        nodes = [nodes]
      }
      nodes.forEach((node: Node) => {
        node.parent = this
        if (!node.fileRoot) {
          node.fileRoot = this.fileRoot
        }
        if (!node.root) {
          node.root = this.root
        }
      })
    })
  }

  /** @todo - Visitor type */
  accept(visitor: any) {
    this.processChildren(this, (node: Node) => visitor.visit(node))
  }

  /**
   * Return a primitive value, if it exists, otherwise call `.toString()`
   */
  valueOf() {
    if (this.value !== undefined) {
      return this.value
    }
    return this.toString(true)
  }

  toString(omitPrePost: boolean = false) {
    let text: string
    if (this.text !== undefined) {
      text = this.text
    } else if (this.value !== undefined) {
      text = this.value.toString()
    } else {
      text = this.nodes.join('')
    }
    if (omitPrePost) {
      return text
    }
    return this.pre + text + this.post
  }

  /** Nodes may have individual compare strategies */
  compare(node: Node) {
    return compare(this, node)
  }

  /**
   * Attach properties from inherited node.
   * This is used when cloning, but also when
   * doing any kind of node replacement (during eval).
   */
  inherit(inheritFrom: Node): this {
    Node.inheritanceKeys.forEach(key => {
      const ref = inheritFrom[key]
      if (ref !== undefined) {
        this[key] = ref
      }
    })

    return this
  }

  /**
   * Derived nodes can pass in context to eval and clone at the same time.
   *
   * Typically a clone of the entire tree happens at the beginning of the eval cycle,
   * but it is sometimes re-used by sub-nodes during eval.
   *
   * @param shallow - doesn't deeply clone nodes (retains references)
   */
  clone(shallow: boolean = false): this {
    const Clazz = Object.getPrototypeOf(this).constructor
    const newNode = new Clazz(
      {
        pre: this.pre,
        post: this.post,
        value: this.value,
        text: this.text,
        ...this.children
        /** For now, there's no reason to mutate this.location, so its reference is just copied */
      },
      { ...this.options },
      this.location
    )

    /**
     * First copy over Node-derived-specific props. We eliminate any props specific
     * to the base Node class.
     */
    for (let prop in this) {
      if (this.hasOwnProperty(prop) && Node.nodeKeys.indexOf(prop) === -1) {
        newNode[prop] = this[prop]
      }
    }

    newNode.childKeys = [...this.childKeys]

    /** Copy inheritance props */
    newNode.inherit(this)

    /**
     * If this is the root node, we update the root reference but _not_ fileRoot.
     * (fileRoot is the original tree)
     */
    if (this instanceof Rules && this === this.root) {
      newNode.root = newNode
    }

    if (!shallow) {
      /**
       * Perform a deep clone
       * This will overwrite the parent / root props of children nodes.
       */
      this.processChildren(newNode, (node: Node) => node.clone(true))
    }
    return newNode
  }

  protected getFileInfo(): IFileInfo {
    return this.fileRoot.fileInfo
  }

  /**
   * Convenience method if location isn't copied to new nodes
   * for any reason (such as a custom function)
   */
  protected getLocation(): ILocationInfo | undefined {
    let node: Node = this
    while (node) {
      if (node.location) {
        return node.location
      }
      node = node.parent
    }
  }

  find(
    context: Context,
    matchFunction: MatchFunction,
    option: MatchOption = MatchOption.FIRST
  ): Node | Node[] | undefined {
    let node: Node | undefined = this
    const matches: Node[] = []
    const crawlRules = (rulesNode: Node) => {
      const nodes = rulesNode.nodes
      const nodeLength = nodes.length

      for (let i = nodeLength; i > 0; i--) {
        const node = nodes[i - 1]
        const match = matchFunction(node)
        if (match) {
          matches.push(match)
          if (option === MatchOption.FIRST) {
            break
          }
        }
        if (node instanceof ImportRule) {
          const content = node.content
          if (content instanceof Rules) {
            crawlRules(content)
          }
        }
      }
    }

    let maxTreeDepth = 1000
    let currDepth = 0
    while (node) {
      currDepth++
      /**
       * If we end up in an infinite loop because something has set
       * node.parent to a child (or itself), we need to exit at some point.
       */
      if (currDepth > maxTreeDepth) {
        return this.error('Maximum tree depth exceeded', context)
      }
      if (node instanceof Rules) {
        crawlRules(node)
        if (matches.length && option !== MatchOption.IN_SCOPE) {
          if (option === MatchOption.FIRST) {
            return matches[0]
          }
          return matches
        }
      }
      if (option !== MatchOption.IN_RULES) {
        node = node.parent
      } else {
        node = undefined
      }
    }

    return matches.length ? matches : undefined
  }

  /** Moved from Rules property() method */
  findProperty(context: Context, name: string): Declaration[] {
    return <Declaration[]> this.find(
      context,
      (node: Node) => {
        if (
          node instanceof Declaration
          && !node.options.isVariable
          && node.evalName(context) === name
        ) {
          return node
        }
      },
      MatchOption.ALL_RULES
    )
  }

  /** Moved from Rules variable() method */
  findVariable(context: Context, name: string): Declaration {
    return <Declaration> this.find(
      context,
      (node: Node) => {
        if (
          node instanceof Declaration
          && node.options.isVariable
          && node.evalName(context) === name
        ) {
          return node
        }
      },
      MatchOption.FIRST
    )
  }

  /**
   * This is an in-place mutation of a node array
   *
   * Unresolved Q: would a new array be more performant than array mutation?
   * The reason we do this is because the array may not mutate at all depending
   * on the result of processing
   */
  protected processNodes(nodes: Node[], processFunc: ProcessFunction): Node[] {
    let thisLength = nodes.length
    for (let i = 0; i < thisLength; i++) {
      const item = nodes[i]
      const returnValue = processFunc(item)
      if (Array.isArray(returnValue)) {
        const nodeLength = returnValue.length
        if (returnValue.length === 0) {
          nodes.splice(i, 1)
          i--
          continue
        } else {
          nodes.splice(i, 1, ...returnValue)
          thisLength += nodeLength
          i += nodeLength
          continue
        }
      }
      if (!returnValue) {
        nodes.splice(i, 1)
        i--
        continue
      }
      nodes[i] = returnValue
    }

    return nodes
  }

  protected processChildren(node: Node, processFunc: ProcessFunction) {
    node.childKeys.forEach(key => {
      let nodes = node[key]
      if (nodes) {
        if (node !== this) {
          /** This is during cloning */
          if (Array.isArray(nodes)) {
            nodes = [...nodes]
            node[key] = node.processNodes(nodes, processFunc)
            nodes.forEach((n: Node) => {
              n.parent = node
              n.root = node.root
            })
          } else {
            const result = node.processNodes([nodes], processFunc)
            result.forEach((n: Node) => {
              n.parent = node
              n.root = node.root
            })
            if (result.length === 1) {
              node[key] = result[0]
            } else {
              node[key] = result
            }
          }
        } else {
          if (Array.isArray(nodes)) {
            this.processNodes(nodes, processFunc)
          } else {
            node[key] = this.processNodes([nodes], processFunc)
          }
        }
      }
    })
  }

  protected inheritChild(node: Node) {
    node.parent = this
    node.root = this.root
    node.fileRoot = this.fileRoot
  }

  appendNode(nodes: Node[], insertedNode: Node) {
    this.inheritChild(insertedNode)
    nodes.push(insertedNode)
  }

  prependNode(nodes: Node[], insertedNode: Node) {
    this.inheritChild(insertedNode)
    nodes.unshift(insertedNode)
  }

  /**
   * By default, nodes will just evaluate nested values
   * However, some nodes after evaluating will of course override
   * this to produce different node types or primitive values
   */
  eval(context: Context): EvalReturn {
    context.currentNode = this
    /** All nodes that override eval() should (usually) exit if they're evaluated */
    if (!this.evaluated) {
      const node = this.clone(true)
      context.currentNode = node
      this.processChildren(node, (node: Node) => node.eval(context))
      node.evaluated = true
      return node
    }
    return this
  }

  toArray() {
    return this.nodes
  }

  error(message: string, context?: Context) {
    if (context) {
      context.error({ message }, this.fileRoot)
      return this
    }
    throw new Error(message)
  }

  warn(message: string, context?: Context) {
    if (context) {
      context.warning({ message }, this.fileRoot)
    }
    return this
  }

  /**
   * Output is a kind of string builder?
   * @todo - All genCSS and toCSS will get moved out of the AST and
   *         into visitor processing.
   */
  genCSS(output: any, context?: Context) {
    output.add(this.toString())
  }

  // Returns true if this node represents root of ast imported by reference
  // blocksVisibility() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     return this.visibilityBlocks !== 0;
  // }

  // addVisibilityBlock() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     this.visibilityBlocks = this.visibilityBlocks + 1;
  // }

  // removeVisibilityBlock() {
  //     if (this.visibilityBlocks == null) {
  //         this.visibilityBlocks = 0;
  //     }
  //     this.visibilityBlocks = this.visibilityBlocks - 1;
  // }

  // Turns on node visibility - if called node will be shown in output regardless
  // of whether it comes from import by reference or not
  // ensureVisibility() {
  //     this.nodeVisible = true;
  // }

  // Turns off node visibility - if called node will NOT be shown in output regardless
  // of whether it comes from import by reference or not
  // ensureInvisibility() {
  //     this.nodeVisible = false;
  // }

  // return values:
  // isVisible() {
  //     return this.nodeVisible;
  // }

  // visibilityInfo() {
  //     return {
  //         visibilityBlocks: this.visibilityBlocks,
  //         nodeVisible: this.nodeVisible
  //     };
  // }

  copyVisibilityInfo(info: { isVisible: boolean; visibilityBlocks: number }) {
    if (!info) {
      return
    }
    this.visibilityBlocks = info.visibilityBlocks
    this.isVisible = info.isVisible
  }
}
