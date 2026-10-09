/**
 * Options mapping between Less render options and Jess compiler config.
 */

/**
 * `less.render` / `less.renderFile` options. A `styles.config.*` beside (or
 * above) the file is read too: an option set here wins over the same option in
 * its `language.less` block, which applies only to options left unset here.
 */
export interface LessRenderOptions {
  filename?: string;
  paths?: string[];
  /**
   * Legacy Less render plugins are routed through the alpha compatibility
   * layer. File-manager, pre/post-processor, and @plugin execution are not
   * alpha.1-supported surfaces yet.
   */
  plugins?: unknown[];
  math?: 0 | 1 | 2 | 3 | 'always' | 'parens-division' | 'parens' | 'strict' | 'strict-legacy';
  /** @deprecated Use `math`. `true` is `math: 'parens'`; `false` leaves the default. Warns. */
  strictMath?: boolean;
  /** Unit handling in math: `'preserve'` (the default), `'strict'`, or `'loose'` (the Less 4.x fold). */
  unitMode?: 'loose' | 'preserve' | 'strict';
  /** @deprecated Use `unitMode`. `true` is `unitMode: 'strict'`; `false` leaves the default. Warns. */
  strictUnits?: boolean;
  /** @deprecated Accepted for Less 4.x compatibility and ignored, with a warning; use `sourceMap`. */
  dumpLineNumbers?: 'comments' | 'mediaquery' | 'all';
  /** @deprecated Accepted for Less 4.x compatibility and ignored, with a warning: remote imports always verify the certificate. */
  insecure?: boolean;
  /** @deprecated Removed: accepted and ignored, with a warning. Every `@import` is processed where it is written. */
  strictImports?: boolean;
  /** @deprecated Accepted for Less 4.x compatibility and ignored, with a warning. */
  ieCompat?: boolean;
  /**
   * Fetch and inline `https` `@import`s from these hosts (exact host names).
   * Needs the optional `@jesscss/plugin-remote-import` installed next to less.
   * Without it, no remote import is fetched.
   */
  allowRemoteImports?: string[];
  /**
   * How to flatten authored nesting. Less v5 preserves authored nesting by
   * default (`false`). `'native'` applies the CSS Nesting desugaring (parent
   * wrapped in `:is()`, child selector lists distributed — specificity-faithful,
   * matching the browser and Less 4.x); `'compact'` additionally folds
   * same-combinator descendant runs into a single `:is()`. `true` is a
   * deprecated alias for `'native'`.
   */
  collapseNesting?: boolean | 'native' | 'compact';
  /** Minified output. */
  compress?: boolean;
  /** Prepend a path to every rewritten `url(...)` and imported reference. */
  rootpath?: string;
  /** Rewrite relative `url(...)` against the importing file: `'all'` | `'local'` | `'off'` (or boolean). */
  rewriteUrls?: boolean | 'all' | 'local' | 'off';
  /** @deprecated Use `rewriteUrls`. `true` is `rewriteUrls: 'all'`; `false` leaves the default. An explicit `rewriteUrls` wins. Warns. */
  relativeUrls?: boolean;
  /** Append a query string to every non-data `url(...)`. */
  urlArgs?: string;
  /**
   * Whether the Less built-in functions are ambient. `'auto'` (the default)
   * decides per file: a file that uses `@use` or `@compose` is in modern mode.
   * `'modern'` puts every file in modern mode, where a built-in must be imported
   * (`@use "#less";` then `@less.darken(red, 10%)`) and an unimported call keeps
   * its name and call shape.
   */
  moduleMode?: 'auto' | 'modern';
  /** `false` skips import processing: imported stylesheets are neither loaded nor kept as CSS `@import` statements. */
  processImports?: boolean;
  /** Variables declared at the top of the entry file, so the file can override them. A name may carry its `@`. */
  globalVars?: Record<string, string | number>;
  /** Variables declared at the end of the entry file, so they override the file. A name may carry its `@`. */
  modifyVars?: Record<string, string | number>;
  /** Less source added ahead of the entry file: typically a comment, which is printed ahead of the output. */
  banner?: string;
  /**
   * Emit a source map. `true` turns it on with defaults; the object form (or the
   * flat legacy `sourceMap*` options) configures it. Returned as `result.map`.
   */
  sourceMap?: boolean | {
    sourceMapURL?: string;
    sourceMapFilename?: string;
    sourceMapFullFilename?: string;
    sourceMapRootpath?: string;
    sourceMapBasepath?: string;
    sourceMapFileInline?: boolean;
    sourceMapOutputFilename?: string;
    outputSourceFiles?: boolean;
    disableSourcemapAnnotation?: boolean;
  };
  sourceMapURL?: string;
  sourceMapFilename?: string;
  sourceMapFullFilename?: string;
  sourceMapRootpath?: string;
  sourceMapBasepath?: string;
  sourceMapFileInline?: boolean;
  sourceMapOutputFilename?: string;
  outputSourceFiles?: boolean;
  disableSourcemapAnnotation?: boolean;
  /** @internal Jess alpha benchmark-only flag for source graphs already proven @plugin-free. */
  __jessSkipLessCompatWhenPluginFree?: boolean;
}

export interface LessRenderResult {
  css: string;
  map?: string;
  imports?: string[];
}

export interface JessRenderResult {
  css?: string;
  map?: string | object;
  imports?: string[];
}

export function createLessOptions(options?: LessRenderOptions): {
  configOptions: object;
  filePath?: string;
};

export function compilerOptionsOf(configOptions: object): object;

export function lessCompilerHooks(): {
  normalizeConfiguredPlugin: (plugin: { name: string }, context: object) => object;
  prepareSource: (source: string, context: object) => { source: string; sourceOffset: number };
};

export function getCompilerCacheKey(configOptions: object): string;

export function mapRenderResult(
  result: JessRenderResult,
  options?: LessRenderOptions
): LessRenderResult;
