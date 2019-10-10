import { Context } from './tree/context'
import { Less } from './index'
import { IOptions } from './options'

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
  (str: string, color?: TextFormat)
}

export type ParseOptions = IOptions & {
  plugins?: Plugin[]
  filename?: string
}

export type ParseFunction = (input: string, options?: ParseOptions, callback?: Function) => Promise<any>

export type Plugin = {
  /**
   * An (optional) identifier for error messages
   */
  name?: string

  /** 
   * Called immediately after the plugin is 
   * first imported, only once.
   */
  install(less: Less, context: Context): void

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