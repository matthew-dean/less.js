/**
 * Options mapping between Less render options and Jess compiler config.
 * @module less/lib/options
 */

import { createRequire } from 'node:module';
import lessPlugin, { LessPluginResolver, prepareLessRootSource } from '@jesscss/plugin-less';
import { lessCompatPlugin } from '@jesscss/plugin-less-compat';
import { logger } from './logger.js';

const require = createRequire(import.meta.url);

function validateAlphaOptions(options) {
  // A falsy value is the 4.x default ("off") and requests nothing, so it is a
  // no-op here; only an actual request for the feature is unsupported.
  if (options.javascriptEnabled) {
    throw new Error('javascriptEnabled is not supported: JavaScript evaluation is not supported');
  }
}

/**
 * @param {any} value
 * @param {WeakSet<object>} [seen]
 * @returns {string}
 */
function stableStringify(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object') {
    if (typeof value === 'function') {
      return JSON.stringify(`[function ${value.name || 'anonymous'}]`);
    }
    return JSON.stringify(value);
  }
  if (seen.has(value)) {
    return '"[Circular]"';
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item, seen)).join(',')}]`;
  }
  if (value instanceof Set) {
    return stableStringify([...value].sort(), seen);
  }
  if (value.name && typeof value.name === 'string' && ('install' in value || 'parser' in value || 'opts' in value)) {
    return stableStringify({
      plugin: value.name,
      opts: value.opts || {},
    }, seen);
  }
  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`);
  return `{${entries.join(',')}}`;
}

/**
 * `collapseNesting` accepts `false` (keep authored nesting — the v5 default),
 * `'native'` (CSS Nesting desugaring: parent wrapped in `:is()`, child selector
 * lists distributed, specificity-faithful), `'compact'` (like `'native'` but
 * also folds same-combinator descendant runs into one `:is()`), or the
 * deprecated boolean `true` (alias for `'native'`). Anything else is rejected.
 * @param {unknown} value
 * @returns {boolean|'native'|'compact'}
 */
function resolveCollapseNesting(value) {
  if (value === false || value === true || value === 'native' || value === 'compact') {
    return value;
  }
  throw new Error(
    `collapseNesting must be false, 'native', 'compact', or true `
    + `(deprecated alias for 'native'); got ${JSON.stringify(value)}`
  );
}

/**
 * `moduleMode` decides whether the Less built-in functions are ambient:
 * `'auto'` (the default — a file that uses `@use` or `@compose` is modern, any
 * other file is legacy) or `'modern'` (every file is modern, so a built-in must
 * be imported). Anything else is rejected rather than silently read as `'auto'`.
 * TODO(jesscss/jess#354): the pinned Jess 2.0.0-alpha.27 does not check the
 * value. From the next Jess alpha, the `@jesscss/plugin-less` default export
 * does: its constructor, which `LessPluginResolver#normalizeConfiguredPlugin`
 * (this wrapper's `normalizeConfiguredPlugin` hook) runs on the merged Less
 * options, throws a `plugin/invalid-option` error naming the option and its
 * allowed values. Once the pin reaches it, forward `opts.moduleMode` unchanged
 * and delete this function.
 * @param {unknown} value
 * @returns {'auto'|'modern'}
 */
function resolveModuleMode(value) {
  if (value === 'auto' || value === 'modern') {
    return value;
  }
  throw new Error(`moduleMode must be 'auto' or 'modern'; got ${JSON.stringify(value)}`);
}

/**
 * The Less 4.x `math` values and the `mathMode` each selects. Anything else is
 * rejected rather than silently read as another mode.
 * TODO(jesscss/jess#354): from the next Jess alpha the same plugin constructor
 * (see `resolveModuleMode`) maps `math` to `mathMode` and rejects any other
 * value, so this table and its check go: forward `opts.math` as `language.math`.
 */
const MATH_MODES = new Map([
  [0, 'always'], ['always', 'always'],
  [1, 'parens-division'], ['parens-division', 'parens-division'],
  [2, 'parens'], ['parens', 'parens'], ['strict', 'parens'],
  [3, 'parens'], ['strict-legacy', 'parens'],
]);

/**
 * The `mathMode` an explicit `math` (or its deprecated boolean alias
 * `strictMath`) selects, or `undefined` when the caller set neither. As in
 * Less 4.x, a truthy `strictMath` is `math: 'parens'`; a falsy one sets no
 * math, so a file-local styles.config or the default applies. An explicit
 * `math` wins; otherwise `strictMath` warns.
 * @param {import('./options.js').LessRenderOptions} opts
 * @returns {string|undefined}
 */
function resolveMathMode(opts) {
  if (opts.strictMath !== undefined && opts.math === undefined) {
    logger.warn(
      `strictMath is deprecated; use math. strictMath: ${String(opts.strictMath)} now means `
      + (opts.strictMath ? "math: 'parens'" : "no math option (the default is 'parens-division')")
    );
  }
  const math = opts.math !== undefined ? opts.math : opts.strictMath ? 'parens' : undefined;
  if (math === undefined) {
    return undefined;
  }
  const mathMode = MATH_MODES.get(math);
  if (mathMode === undefined) {
    throw new Error(
      `math must be 'always', 'parens-division', 'parens' or 'strict' (or 0-3); got ${JSON.stringify(math)}`
    );
  }
  return mathMode;
}

/**
 * The opt-in remote-import plugin for an `allowRemoteImports` host list (the
 * `lessc --allow-remote-imports` flag). It is an optional install, so it is
 * loaded only when asked for; the plugin itself rejects an empty list or a
 * malformed host.
 * @param {unknown} hosts
 */
function createRemoteImportPlugin(hosts) {
  if (!Array.isArray(hosts) || !hosts.every(host => typeof host === 'string')) {
    throw new Error(`allowRemoteImports must be an array of host names; got ${JSON.stringify(hosts)}`);
  }
  let remoteImportPlugin;
  try {
    ({ remoteImportPlugin } = require('@jesscss/plugin-remote-import'));
  } catch (error) {
    // Only the package itself being absent is "not installed"; any other
    // failure (including a missing dependency of it) is reported as it is.
    if (error?.code === 'MODULE_NOT_FOUND' && error.message.includes("'@jesscss/plugin-remote-import'")) {
      throw new Error('allowRemoteImports needs @jesscss/plugin-remote-import. Install it next to less.');
    }
    throw error;
  }
  return remoteImportPlugin({ allow: hosts });
}

/**
 * Build the compiler's `output.sourceMap` value from Less options. Source maps
 * are enabled when `sourceMap` is truthy; the object form (or the flat legacy
 * `sourceMap*` options) configures the details. Returns `undefined` when no
 * source map is requested.
 * @param {import('./options.js').LessRenderOptions} opts
 * @returns {undefined | true | Record<string, unknown>}
 */
function resolveSourceMap(opts) {
  if (!opts.sourceMap) {
    return undefined;
  }
  const config = (typeof opts.sourceMap === 'object' && opts.sourceMap !== null)
    ? { ...opts.sourceMap }
    : {};
  // Fold the flat legacy `sourceMap*` options into the object form the compiler
  // reads; an explicit object sub-option wins over its flat alias.
  const flat = [
    'sourceMapURL', 'sourceMapFilename', 'sourceMapFullFilename',
    'sourceMapRootpath', 'sourceMapBasepath', 'sourceMapFileInline',
    'sourceMapOutputFilename', 'outputSourceFiles', 'disableSourcemapAnnotation'
  ];
  for (const key of flat) {
    if (opts[key] !== undefined && config[key] === undefined) {
      config[key] = opts[key];
    }
  }
  return Object.keys(config).length > 0 ? config : true;
}

/**
 * Map Less render options to Jess compiler config.
 * @param {import('./options.js').LessRenderOptions} [options] Less-style options
 * @returns {{ configOptions: object, filePath?: string }}
 */
export function createLessOptions(options) {
  const opts = options || {};
  validateAlphaOptions(opts);
  const filePath = opts.filename || undefined;
  const lessPlugins = Array.isArray(opts.plugins) ? opts.plugins : [];
  const skipLessCompat =
    opts.__jessSkipLessCompatWhenPluginFree === true && lessPlugins.length === 0;

  // `unitMode` is the option ('loose' | 'preserve' | 'strict'); `strictUnits`
  // is its deprecated boolean alias: true → 'strict'; false means "not strict",
  // i.e. the default ('preserve') — never the Less 4.x 'loose' fold, which only
  // an explicit `unitMode: 'loose'` selects. Any use warns so the mapping is
  // never discovered by staring at output.
  const unitMode = opts.unitMode !== undefined ? opts.unitMode
    : opts.strictUnits === true ? 'strict'
    : undefined;
  if (opts.strictUnits !== undefined && opts.unitMode === undefined) {
    logger.warn(
      `strictUnits is deprecated; use unitMode. strictUnits: ${String(opts.strictUnits)} now means `
      + `unitMode: '${unitMode ?? 'preserve'}'${opts.strictUnits ? '' : " (Less 4.x unit folding is unitMode: 'loose')"}`
    );
  }

  // The Less options the caller set, as `language.less`. The compiler merges
  // them over a file-local styles.config `language.less`, and the Less plugin is
  // built from the result, so an explicit option wins, the file's config applies
  // to whatever the caller left unset, and the plugin's v5 defaults to the rest.
  // Less 4.x has only the options passed to render; a styles.config stands in
  // for options, never over them.
  const language = {};
  const mathMode = resolveMathMode(opts);
  if (mathMode !== undefined) language.mathMode = mathMode;
  if (unitMode !== undefined) language.unitMode = unitMode;
  if (opts.processImports !== undefined) language.processImports = opts.processImports;
  if (opts.rootpath !== undefined) language.rootpath = opts.rootpath;
  if (opts.rewriteUrls !== undefined) language.rewriteUrls = opts.rewriteUrls;
  if (opts.urlArgs !== undefined) language.urlArgs = opts.urlArgs;
  if (opts.moduleMode !== undefined) language.moduleMode = resolveModuleMode(opts.moduleMode);
  // Text the compiler's `prepareSource` hook (`prepareLessRootSource`) adds to
  // the entry file only: `banner` and `globalVars` ahead of it, `modifyVars`
  // after it.
  if (opts.banner !== undefined) language.banner = opts.banner;
  if (opts.globalVars !== undefined) language.globalVars = opts.globalVars;
  if (opts.modifyVars !== undefined) language.modifyVars = opts.modifyVars;
  // Accepted for Less 4.x compatibility with no effect; the compiler warns.
  if (opts.dumpLineNumbers !== undefined) language.dumpLineNumbers = opts.dumpLineNumbers;

  const plugins = [lessPlugin()];
  if (!skipLessCompat) {
    plugins.push(lessCompatPlugin({ plugins: lessPlugins }));
  }
  if (opts.allowRemoteImports !== undefined) {
    plugins.push(createRemoteImportPlugin(opts.allowRemoteImports));
  }

  // The projection/serialization options the compiler reads off `output`:
  // `collapseNesting` (nesting flatten mode), `compress` (minified output), and
  // `sourceMap`. Emitted as a single file-less array entry so an explicit render
  // option overrides a file-local styles.config for every key (the config merge
  // appends it as the override default); left `{}` when the caller set none.
  const outputEntry = {};
  if (opts.collapseNesting !== undefined) {
    outputEntry.collapseNesting = resolveCollapseNesting(opts.collapseNesting);
  }
  if (opts.compress !== undefined) {
    outputEntry.compress = opts.compress;
  }
  const sourceMap = resolveSourceMap(opts);
  if (sourceMap !== undefined) {
    outputEntry.sourceMap = sourceMap;
  }
  const output = Object.keys(outputEntry).length > 0 ? [outputEntry] : {};

  const configOptions = {
    compile: {
      searchPaths: opts.paths || [],
      plugins,
    },
    output,
    language: Object.keys(language).length > 0 ? { less: language } : {},
  };

  return { configOptions, filePath };
}

/**
 * The compiler hooks the Node and browser builds share: the Less plugin is
 * rebuilt from the Less options resolved for each file (the render options
 * merged over a file-local styles.config `language.less`), and `prepareSource`
 * adds `banner` and `globalVars` ahead of the entry file and `modifyVars` after
 * it, as Less 4 did; source maps skip the added text.
 * @returns {{ normalizeConfiguredPlugin: Function, prepareSource: Function }}
 */
export function lessCompilerHooks() {
  const lessPluginResolver = new LessPluginResolver();
  return {
    normalizeConfiguredPlugin: (plugin, context) => plugin.name === 'less'
      ? lessPluginResolver.normalizeConfiguredPlugin(plugin, context)
      : plugin,
    prepareSource: prepareLessRootSource,
  };
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

  // Less 4.x returns the source map as `result.map` (a JSON string) when one was
  // requested; forward it so `less.render(src, { sourceMap: true })` behaves the
  // same. The compiler writes the `sourceMappingURL` annotation into `css` itself.
  if (result.map !== undefined) {
    out.map = result.map;
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

export default { createLessOptions, getCompilerCacheKey, lessCompilerHooks, mapRenderResult };
