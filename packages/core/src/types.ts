import { EvalContext } from './tree/contexts'
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
}

export type ParseFunction = (input: string, options?: ParseOptions, callback?: Function) => Promise<any>

export type IPlugin = {
  /* Called immediately after the plugin is 
    * first imported, only once. */
  install(less: Less, context: EvalContext): void

  /**
   * Passes an arbitrary string to your plugin from the command line.
   * Note, to receive parsed args, export a function instead of an object
   */
  setOptions?(argumentString: string): void

  /* Set a minimum Less compatibility string
    * You can also use an array, as in [3, 0] */
  minVersion?: [string] | number[]

  /* Used for lessc only, to explain 
    * options in a Terminal */
  printUsage?(): string
}

export type Plugin = IPlugin | ((args: { [key: string]: any }) => IPlugin)