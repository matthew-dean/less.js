import Parser from './parser/parser'
import PluginManager from './plugin-api'
import LessError from './less-error'
import { Context } from './tree/context'
import { IFileInfo } from './tree/nodes'
import { ParseTree } from './parse-tree'
import AssetManager from './asset-manager'
import { Less } from './index'
import Environment from './environment/environment'

import { ParseFunction, ParseOptions } from './types'

const ParseFactory = (
  less: Less,
  parseTree: typeof ParseTree,
  importManager: typeof AssetManager
) => {
  const parse: ParseFunction = (input: string, options?: ParseOptions, callback?: Function): Promise<any> => {
    /**
     * Context options is a combination of Less (default) options, usually set by the environment,
     * and the options passed into this function.
     */
    options = {...less.options, ...(options || {})}
    const { plugins, filename, ...opts } = options

    const lessEnvironment = less.environment

    /**
     * This type is to indicate to TypeScript that we're not creating
     * a new instance of the abstract class Environment directly.
     */
    type EnvironmentClass = typeof Environment
    interface DerivedEnvironment extends EnvironmentClass {}

    /** Create an environment copy, so that file managers are not permanently mutated during parse */
    const LocalEnvironment: DerivedEnvironment = Object.getPrototypeOf(lessEnvironment).constructor
    const environment = new LocalEnvironment([...lessEnvironment.fileManagers], lessEnvironment.logger)

    if (!callback) {
      return new Promise((resolve, reject) => {
        parse.call(this, input, options, (err, output) => {
          if (err) {
            reject(err)
          } else {
            resolve(output)
          }
        })
      })
    } else {
      const context = new Context(less, environment, opts)
      const fileInfo: IFileInfo = environment.getFileInfo(filename)
      const assets = new AssetManager(this.less, context, fileInfo)

      if (plugins) {
        plugins.forEach(plugin => assets.)
      }

      new Parser(context, assets, fileInfo)
        .parse(input, (e, root) => {
            if (e) { return callback(e); }
            callback(null, root, imports, options);
        }, options)
    }
  }
  return parse
}

export default ParseFactory