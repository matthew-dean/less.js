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

import { Compiler } from 'jess';
import { createLessOptions, mapRenderResult } from './options.js';
import { version } from './version.js';
import { Logger } from './logger.js';
import { lesscHelper } from './lessc-helper.js';

/** @type {import('./logger.js').Logger} */
const logger = new Logger();

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
    const { configOptions, filePath } = createLessOptions(options);
    const compiler = new Compiler(configOptions);

    const result = await compiler.renderToResult(
      { source: input, filePath, language: 'less', extension: '.less' },
      configOptions
    );

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
  const { configOptions } = createLessOptions(options);
  const compiler = new Compiler(configOptions);

  const result = await compiler.renderToResult(filePath, configOptions);
  return mapRenderResult(result, options);
}

/** @type {import('./types.js').LessStatic} */
const less = {
  version: version.semver,
  render,
  renderFile,
  logger,
  lesscHelper,
  Compiler,
};

export default less;
export { render, renderFile, version, logger, lesscHelper, Compiler };
