import Parser from './parser'
import PluginManager from './plugin-api'
import LessError from './less-error'
import { Context } from './tree/context'
import { IFileInfo, Rules } from './tree/nodes'
import AssetManager from './asset-manager'
import { Less } from './index'
import Environment from './environment/environment'

import { ParseOptions } from './types'

/** @todo - refine callback definition */
export type ParseFunction = (
  input: string,
  options?: ParseOptions,
  callback?: Function
) => Promise<any>

export const parse: ParseFunction = function (
  this: Less,
  input: string,
  options?: ParseOptions,
  callback?: Function
): Promise<any> {
  const less = this
  /**
   * Context options is a combination of Less (default) options, usually set by the environment,
   * and the options passed into this function.
   */
  options = { ...less.options, ...(options || {}) }
  const { plugins, filePath, ...opts } = options

  const lessEnvironment = less.environment

  /**
   * This type is to indicate to TypeScript that we're not creating
   * a new instance of the abstract class Environment directly.
   */
  type EnvironmentClass = typeof Environment
  interface DerivedEnvironment extends EnvironmentClass {}

  /**
   * Create an environment copy, so that file managers and visitors
   * are not permanently mutated by plugins during parse.
   */
  const LocalEnvironment: DerivedEnvironment = Object.getPrototypeOf(lessEnvironment).constructor
  const environment = new LocalEnvironment(
    [...lessEnvironment.fileManagers],
    [...lessEnvironment.visitors],
    lessEnvironment.logger
  )

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
    const fileInfo: IFileInfo = environment.getFileInfo(filePath)
    const { filename, path } = fileInfo
    const assets = new AssetManager(less, environment, context, fileInfo)

    if (plugins) {
      plugins.forEach(plugin => assets.addPlugin(plugin))
    }

    /** We treat the entry Less content like any other import */
    const fileManager = environment.getFileManager(filename, path, options)
    fileManager
      .parseFile(
        {
          contents: input,
          filename,
          path
        },
        options
      )
      .then((root: Rules) => {
        root.evalImports(context)
        callback(null, root, assets, options)
      })
      .catch(err => callback(err))
  }
}

export default ParseFactory
