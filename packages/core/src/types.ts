import { EvalContext } from './tree/contexts'

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

export type Plugin = {
  /* Called immediately after the plugin is 
    * first imported, only once. */
  install(less, context): void

  /* Passes an arbitrary string to your plugin 
    * e.g. @plugin (args) "file";
    * This string is not parsed for you, 
    * so it can contain (almost) anything */
  setOptions: function(argumentString) { },

  /* Set a minimum Less compatibility string
    * You can also use an array, as in [3, 0] */
  minVersion: ['3.0'],

  /* Used for lessc only, to explain 
    * options in a Terminal */
  printUsage: function() { },
}