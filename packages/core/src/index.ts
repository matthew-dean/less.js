import Environment from './environment/environment'
import * as tree from './tree/nodes'
import Functions from './functions'
import contexts from './contexts'
import SourceMapOutputFactory, { SourceMapOutput } from './source-map-output'
import SourceMapBuilderFactory from './source-map-builder'
import ParseTreeFactory, { ParseTree } from './parse-tree'
import ImportManagerFactory from './import-manager'
import RenderFactory from './render'
import ParseFactory, { ParseFunction } from './parse'
import LessError from './less-error'
import TransformTree from './transform-tree'
import PluginManager from './plugin-api'
import Default, { IOptions } from './options'

export type Less = {
  version: number[]
  options: IOptions
  environment: Environment
  functions
  parse: ParseFunction
  render: ParseFunction
  LessError: typeof LessError
  SourceMapOutput: typeof SourceMapOutput
  ParseTree: typeof ParseTree,
  ImportManager
  transformTree?
  PluginManager?
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
  const SourceMapOutput = SourceMapOutputFactory(environment)
  const SourceMapBuilder = SourceMapBuilderFactory(SourceMapOutput, environment)
  const ParseTree = ParseTreeFactory(SourceMapBuilder)
  const ImportManager = ImportManagerFactory(environment)

  // const parse = ParseFactory(environment, ParseTree, ImportManager)
  // const render = RenderFactory(environment, ParseTree, ImportManager)
  const functions = Functions(environment)

  const lessConstructor = {
    SourceMapOutput,
    LessError,
    ParseTree,
    ImportManager
  }
  /**
   * @todo
   * This root properties / methods need to be organized.
   * It's not clear what should / must be public and why.
   */
  const less: Less = Object.create(lessConstructor, {
    version: {
      value: [4, 0, 0]
    },
    environment: {
      value: environment
    },
    options: {
      value: opts
    },
    functions: {
      value: functions
    },
    parse: {
      value: null,
      writable: true
    },
    render: {
      value: null,
      writable: true
    }
  })

  less.parse = ParseFactory(less, ParseTree, ImportManager)
  less.render = RenderFactory(less, ParseTree, ImportManager)

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
