import Parser from './parser'
import LessError from './less-error'
import { Context } from './tree/context'
import { IFileInfo, Rules, IImportOptions } from './tree/nodes'
import AssetManager from './asset-manager'
import { Less } from './index'
import Environment from './environment/environment'
import { ParseOptions } from './types'
import { IOptions } from './options'

/** @todo - refine callback definition */
export type ParseFunction = (
  input: string,
  options?: ParseOptions
) => Promise<any>

export const parse: ParseFunction = function (
  this: Less,
  input: string,
  options?: ParseOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    const less = this
    /**
     * Context options is a combination of Less (default) options, usually set by the environment,
     * and the options passed into this function.
     */
    options = { ...less.options, ...(options || {}) }
    const { plugins, filePath, ...extractOpts } = options
    const opts: IOptions = <IOptions>extractOpts

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
    
    const context = new Context(less, environment, opts)
    const fileInfo: IFileInfo = environment.getFileInfo(filePath)
    const { filename, path } = fileInfo
    const assets = new AssetManager(less, environment, context, fileInfo)

    if (plugins) {
      plugins.forEach(plugin => assets.addPlugin(plugin))
    }

    /** 
     * We treat the entry Less content like any other import
     * This way, plugins can add managers for the root type 
     */
    const fileManagerOpts: IOptions & IImportOptions = {...opts, less: true }
    const fileManager = environment.getFileManager(filename, path, fileManagerOpts)
    fileManager
      .parseFile(
        {
          contents: input,
          filename,
          path
        },
        fileManagerOpts
      )
      .then((root: Rules) => {
        root.evalImports(context)
        resolve({ root, assets, options })
      })
      .catch(err => reject(err))
  })
}

export default ParseFactory
