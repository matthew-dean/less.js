import Environment, { FileObject } from './environment/environment'
import FileManager from './environment/file-manager'
import * as tree from './tree/nodes'
import { render, RenderFunction } from './render'
import { parse, ParseFunction } from './parse'
import Default, { IOptions } from './options'
import { IProps, INodeOptions, ILocationInfo } from './tree/node'

export { IOptions }
export * from './tree/nodes'
export * from './environment/environment'
export * from './environment/file-manager'

const { Node } = tree

type GetConstructorArgs<T> = T extends new (...args: infer U) => any ? U : never

export type Less = {
  /** e.g. [4, 0, 0] */
  version: [number, number, number]
  /** Options are optional (will be defaulted) */
  options: IOptions
  environment: Environment
  // functions
  parse?: ParseFunction
  render?: RenderFunction

  /** @todo - is there any way to generate these types or make a generic type? */
  atrule?(...args: GetConstructorArgs<typeof tree.AtRule>): tree.AtRule
  block?(...args: GetConstructorArgs<typeof tree.Block>): tree.Block
  bool?(...args: GetConstructorArgs<typeof tree.Bool>): tree.Bool
  color?(...args: GetConstructorArgs<typeof tree.Color>): tree.Color
  comment?(...args: GetConstructorArgs<typeof tree.Comment>): tree.Comment
  condition?(...args: GetConstructorArgs<typeof tree.Condition>): tree.Condition
  declaration?(...args: GetConstructorArgs<typeof tree.Declaration>): tree.Declaration
  dimension?(...args: GetConstructorArgs<typeof tree.Dimension>): tree.Dimension
  expression?(...args: GetConstructorArgs<typeof tree.Expression>): tree.Expression
  func?(...args: GetConstructorArgs<typeof tree.Func>): tree.Func
  // functioncall?(...args: GetConstructorArgs<typeof tree.FunctionCall>): tree.Func
  list?(...args: GetConstructorArgs<typeof tree.List>): tree.List
  // mixin?(...args: GetConstructorArgs<typeof tree.Mixin>): tree.Mixin
}

/**
 * The Node.js environment will pass in an Environment instance,
 * which will do a one-time setup of the Less API
 */
export default (environment: Environment, options?: IOptions): Less => {
  const opts = Object.assign(Default(), options || {})
  /**
   * @todo
   * This original code could be improved quite a bit.
   * Many classes / modules currently add side-effects / mutations to passed in objects,
   * which makes it hard to refactor and reason about.
   */

  // const parse = ParseFactory(environment, ParseTree, ImportManager)
  // const render = RenderFactory(environment, ParseTree, ImportManager)
  // const functions = Functions(environment)

  /**
   * @todo
   * This root properties / methods need to be organized.
   * It's not clear what should / must be public and why.
   */
  const less: Less = {
    version: [4, 0, 0],
    environment,
    options: opts
  }

  less.parse = parse.bind(less)
  less.render = render.bind(less)

  /**
   * Copy Node interfaces onto the less object so that the new keyword
   * isn't required. To distinguish from nodes, the interfaces are lowercase,
   * as in `less.dimension(...)`
   */
  type NodeType = typeof Node
  interface NodeClass extends NodeType {}

  /** @todo - this isn't right. fix later */
  const ctor = <T extends NodeClass = NodeClass>(t: T) => 
    (...args: GetConstructorArgs<T>) => t.apply(null, [...args])

  less.atrule = ctor(tree.AtRule)
  less.block = ctor(tree.Block)
  less.bool = ctor(tree.Bool)

  return Object.freeze(less)
}
