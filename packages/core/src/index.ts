import Environment from './environment/environment'
import * as tree from './tree/nodes'
// import Functions from './functions'
import { Context } from './tree/context'
import SourceMapOutputFactory, { SourceMapOutput } from './source-map-output'
import SourceMapBuilderFactory from './source-map-builder'
import { RenderTree } from './render-tree'
import AssetManagerFactory from './asset-manager'
import { render, RenderFunction } from './render'
import { parse, ParseFunction } from './parse'
import LessError from './less-error'
// import TransformTree from './transform-tree'
import Default, { IOptions } from './options'
import { Node } from './tree/nodes'

type GetConstructorArgs<T> = T extends new (...args: infer U) => any ? U : never

export type Less = {
  version: number[]
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
    // functions: functions,
  }

  less.parse = parse.bind(less)
  less.render = render.bind(less)

  /**
   * Copy Node interfaces onto the less object so that the new keyword
   * isn't required. To distinguish from nodes, the interfaces are lowercase,
   * as in `less.dimension(...)`
   */
  const ctor = t => (...args) => new t(...args)

  let t: any
  for (const n in tree) {
    /* eslint guard-for-in: 0 */
    t = tree[n]
    if (t instanceof tree.Node) {
      less[n.toLowerCase()] = ctor(t)
    }
  }

  return Object.freeze(less)
}
