/**
 * Less.js v5 — powered by Jess
 *
 * This module provides a Less-compatible API backed by the Jess compiler.
 * It supports the same `less.render()` interface that Less 4.x users expect,
 * while delegating all parsing, evaluation, and output to Jess with the
 * `@jesscss/plugin-less` and `@jesscss/plugin-less-compat` plugins.
 *
 * @module less
 */

import { readFile } from 'node:fs/promises';
import { Compiler } from 'jess';
import { createLessOptions, getCompilerCacheKey, mapRenderResult, functionRegistry, tree } from './options.js';
import { version } from './version.js';
import { logger } from './logger.js';
import { lesscHelper } from './lessc-helper.js';

const compilerCache = new Map();
const lessVersion = version.array;

function toLessError(result, filePath) {
  const diagnostic = result?.errors?.[0];
  const error = new Error(diagnostic?.message || 'Less render failed');

  error.type = diagnostic?.phase || 'Syntax';
  error.filename = diagnostic?.filePath || filePath;
  error.line = diagnostic?.line || 1;
  error.column = diagnostic?.column || 1;
  error.extract = Array.isArray(diagnostic?.lines)
    ? diagnostic.lines.map((line) => typeof line === 'string' ? line : String(line))
    : undefined;
  error.jessErrors = result?.errors || [];
  error.jessWarnings = result?.warnings || [];

  return error;
}

/**
 * @param {object} configOptions
 */
function getCompiler(configOptions) {
  const cacheKey = getCompilerCacheKey(configOptions);
  let compiler = compilerCache.get(cacheKey);
  if (!compiler) {
    compiler = new Compiler(configOptions);
    compilerCache.set(cacheKey, compiler);
  }
  return compiler;
}

/**
 * Render Less source to CSS.
 *
 * @param {string} input - Less source string
 * @param {import('./options.js').LessRenderOptions} [options={}]
 * @param {Function} [callback] - Optional Node-style callback(err, result)
 * @returns {Promise<import('./options.js').LessRenderResult>}
 */
function render(input, options = {}, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const promise = (async () => {
    const { configOptions, filePath } = createLessOptions(options, { source: input });
    const compiler = getCompiler(configOptions);

    const result = await compiler.renderToResult(
      { source: input, filePath, language: 'less', extension: '.less' },
      configOptions
    );

    if (result.errors?.length) {
      throw toLessError(result, filePath);
    }

    return mapRenderResult(result, options);
  })();

  if (callback) {
    promise.then(
      result => callback(null, result),
      err => callback(err)
    );
  }
  return promise;
}

/**
 * Render a Less file to CSS.
 *
 * @param {string} filePath - Absolute or relative path to .less file
 * @param {import('./options.js').LessRenderOptions} [options={}]
 * @returns {Promise<import('./options.js').LessRenderResult>}
 */
async function renderFile(filePath, options = {}) {
  const source = await readFile(filePath, 'utf8');
  const { configOptions } = createLessOptions(options, { source });
  const compiler = getCompiler(configOptions);

  const result = await compiler.renderToResult(filePath, configOptions);
  if (result.errors?.length) {
    throw toLessError(result, filePath);
  }
  return mapRenderResult(result, options);
}

/**
 * Less 4.x compat surface (v5):
 *
 * - `less.functions.functionRegistry.add/addMultiple/get` collects custom
 *   functions into a global store (see options.js). On each render they are
 *   bridged into Jess by the `@jesscss/plugin-less-compat` plugin, which binds
 *   them onto every compiled tree's root scope using the same
 *   `setFunctionBinding` mechanism as the built-in Less functions.
 * - `less.tree.*` exposes Less-4.x-style node constructors (Dimension, Color,
 *   Anonymous, …). v4 custom functions return `less.tree.*` values; the compat
 *   layer converts those Less-shaped nodes back into Jess nodes at the
 *   function-registry boundary.
 *
 * @type {import('./types.js').LessStatic}
 */
const less = {
  version: lessVersion,
  render,
  renderFile,
  logger,
  lesscHelper,
  Compiler,
  functions: { functionRegistry },
  tree,
};

export default less;
export { render, renderFile, logger, lesscHelper, Compiler, lessVersion as version };
