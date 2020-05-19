import { Context } from './tree/context'
import { Less } from './index'
import { IOptions } from './options'
import AssetManager from './asset-manager'
import { EvalReturn, Node } from './tree/nodes'

export enum TextFormat {
  RESET,
  BOLD,
  INVERSE,
  UNDERLINE,
  YELLOW,
  GREEN,
  RED,
  GREY
}

export type TextStyleFunction = {
  (str: string, color?: TextFormat): string
}

export type ParseOptions = Partial<IOptions> & {
  plugins?: Plugin[]
  /** Full path of the file, including the filename */
  filePath?: string
}

export type Plugin = {
  /**
   * An (optional) identifier for error messages
   */
  name?: string

  /**
   * Called immediately after the plugin is
   * first imported, only once.
   */
  install(less: Less, assetManager: AssetManager): void

  /**
   * Passes options to your plugin, if used from lessc
   *
   * @deprecated - plugin modules should export PluginExport
   */
  setOptions?(rawArgs: string): void

  /**
   * Set a minimum Less compatibility string or number e.g. '4.0' or [4, 0]
   */
  minVersion?: string | number[]

  /**
   * Used for lessc only, to explain
   * options in a Terminal
   */
  printUsage?(): string
}

/**
 * NPM modules that export a plugin should always export a function.
 * If the export of the module is a function, lessc will call it with parsed args.
 * Otherwise, lessc will look for a `setOptions` method, and call it with raw args.
 */
export type PluginExport = Plugin | ((args?: { [key: string]: any }) => Plugin)

export interface LessFunction {
  (this: Context, ...args: (Node | undefined)[]): EvalReturn
  evalArgs?: boolean
}

export type FunctionError = Error & { pos?: number }
