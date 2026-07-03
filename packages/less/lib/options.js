/**
 * Options mapping between Less render options and Jess compiler config.
 * @module less/lib/options
 */

import { lessCompatPlugin, LessTreeConstructors } from '@jesscss/plugin-less-compat';

const AT_PLUGIN_RE = /(^|[\r\n])\s*@plugin\b/m;

/**
 * Global custom-function store backing `less.functions.functionRegistry`.
 * Keyed by lower-cased function name. Shared by reference into every compat
 * plugin instance so functions registered at any time are picked up on the next
 * render, even by cached compilers.
 * @type {Record<string, Function>}
 */
export const customFunctions = {};

/**
 * Less 4.x-compatible function registry. Custom functions registered here are
 * bridged into Jess (via the less-compat plugin) and bound onto every compiled
 * tree's root scope, exactly like the built-in Less functions.
 */
export const functionRegistry = {
  /**
   * @param {string} name
   * @param {Function} fn
   */
  add(name, fn) {
    customFunctions[String(name).toLowerCase()] = fn;
  },
  /**
   * @param {Record<string, Function>} functions
   */
  addMultiple(functions) {
    Object.keys(functions || {}).forEach((name) => {
      this.add(name, functions[name]);
    });
  },
  /**
   * @param {string} name
   * @returns {Function|undefined}
   */
  get(name) {
    return customFunctions[String(name).toLowerCase()];
  }
};

/**
 * Less 4.x `less.tree.*` node constructors (Dimension, Color, Anonymous, …).
 * These build Less-shaped nodes that the less-compat layer converts to Jess
 * nodes at the function-registry boundary.
 */
export const tree = LessTreeConstructors;

/**
 * @param {any} value
 * @returns {string}
 */
function stableStringify(value) {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Map Less render options to Jess compiler config.
 * @param {import('./options.js').LessRenderOptions} [options] Less-style options
 * @param {{ source?: string }} [runtime] Render-time inputs used for feature detection
 * @returns {{ configOptions: object, filePath?: string }}
 */
export function createLessOptions(options, runtime = {}) {
  const opts = options || {};
  const filePath = opts.filename || undefined;
  const hasCustomFunctions = Object.keys(customFunctions).length > 0;
  const shouldEnableCompat =
    (Array.isArray(opts.plugins) && opts.plugins.length > 0) ||
    hasCustomFunctions ||
    (typeof runtime.source === 'string' && AT_PLUGIN_RE.test(runtime.source));

  const math = /** @type {number|string|undefined} */ (opts.math);
  const mathMode =
    math === 0 || math === 'always' ? 'always' :
    math === 2 || math === 'parens' || math === 'strict' ? 'parens' :
    'parens-division';

  const configOptions = {
    compile: {
      searchPaths: opts.paths || [],
      mathMode,
      plugins: shouldEnableCompat
        ? [lessCompatPlugin({ plugins: opts.plugins || [], functions: customFunctions })]
        : [],
    },
    output: {},
    language: {},
  };

  return { configOptions, filePath };
}

/**
 * Stable compiler cache key for a Jess compiler configured from Less options.
 * @param {object} configOptions Jess compiler config
 * @returns {string}
 */
export function getCompilerCacheKey(configOptions) {
  return stableStringify(configOptions);
}

/**
 * Map Jess render result to Less-style result.
 * @param {import('./options.js').JessRenderResult} result Jess compiler result
 * @param {import('./options.js').LessRenderOptions} [options] Original Less options
 * @returns {import('./options.js').LessRenderResult}
 */
export function mapRenderResult(result, options) {
  const opts = options || {};
  /** @type {import('./options.js').LessRenderResult} */
  const out = {
    css: result.css ?? '',
  };

  if (opts.sourceMap && result.map != null) {
    out.map = typeof result.map === 'string' ? result.map : JSON.stringify(result.map);
  }

  if (result.imports && Array.isArray(result.imports)) {
    out.imports = result.imports;
  }

  // Structured Jess warnings (e.g. selector/parentless-ampersand). Exposed so
  // callers and tests can assert them, mirroring how errors surface.
  if (result.warnings && Array.isArray(result.warnings)) {
    out.warnings = result.warnings;
  }

  return out;
}

export default { createLessOptions, getCompilerCacheKey, mapRenderResult };
