/**
 * JSDoc type definitions for Less.js v5 (Jess wrapper).
 * @module less/lib/types
 */

/**
 * @typedef {import('./options.js').LessRenderResult} LessRenderResult
 */

/**
 * @typedef {Object} LessStatic
 * @property {string} version
 * @property {function(string, import('./options.js').LessRenderOptions?, function?): Promise<LessRenderResult>} render
 * @property {function(string, import('./options.js').LessRenderOptions?): Promise<LessRenderResult>} renderFile
 * @property {import('./logger.js').default} logger
 * @property {import('./lessc-helper.js').default} lesscHelper
 * @property {object} Compiler
 */

export {};
