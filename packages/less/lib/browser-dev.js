/**
 * Less.js v5 — browser build (powered by Jess).
 *
 * Bundled to an IIFE that defines `window.less` with the Less 4.x browser API:
 *
 * - `less.render(input, options?, callback?)` returns a Promise and also invokes
 *   the err-first callback when one is given.
 * - On load it compiles every `<link rel="stylesheet/less">` and
 *   `<style type="text/less">` on the page, configured by a `window.less`
 *   options object set before the script and by `data-*` attributes on the
 *   script tag and on each link; `less.pageLoadFinished` settles when it is done.
 * - `less.refresh()`, `less.modifyVars()`, `less.refreshStyles()`,
 *   `less.registerStylesheets()` and `less.watch()` / `less.unwatch()` compile
 *   them again.
 *
 * The page's origin is the file system: `@import`s are read with `fetch()`, by
 * URL path relative to the importing source, as Less 4 read them with XHR.
 *
 * @module less/browser-dev
 */

import { Compiler } from '@jesscss/compiler';
import { prepareLessRootSource } from '@jesscss/plugin-less';
import { createLessOptions, mapRenderResult } from './options.js';

/* Injected at build time from packages/less/package.json. */
/* global __LESS_VERSION__ */
const semver = typeof __LESS_VERSION__ === 'string' ? __LESS_VERSION__ : '5.0.0-alpha.0';
const versionArray = semver.split('.').map((n) => parseInt(n, 10) || 0).slice(0, 3);

/**
 * Build a Less-4.x-shaped error from the first Jess diagnostic. No fs fallback:
 * in the browser there is no file to re-read for the source extract.
 * @param {import('./options.js').JessRenderResult} result
 */
function createRenderError(result) {
  const diagnostic = (result?.errors || [])[0];
  const error = new Error(diagnostic?.message || 'Less render failed');
  error.type = diagnostic?.phase || 'Syntax';
  error.filename = diagnostic?.filePath || 'input';
  error.line = diagnostic?.line || 1;
  error.column = diagnostic?.column || 1;
  const lines = diagnostic?.lines;
  error.extract = Array.isArray(lines) ? lines.map(String) : undefined;
  error.jessErrors = result?.errors || [];
  error.jessWarnings = result?.warnings || [];
  return error;
}

/**
 * Read `url`, failing with the status when the server has no such file.
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function fetchText(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`'${url}' wasn't found (${response.status})`);
  }
  return response.text();
}

/**
 * The text of every file fetched, by URL, shared by every render as Less 4's
 * browser file cache was. `useFileCache: false` skips reading it;
 * `refresh(true)` and each `watch()` poll empty it.
 * @type {Map<string, string>}
 */
const fileCache = new Map();

/**
 * Read `url`, from the file cache unless `options.useFileCache` is `false`.
 * @param {string} url
 * @param {Record<string, any>} options
 * @param {RequestInit} [init]
 */
async function loadFile(url, options, init) {
  const cached = options.useFileCache === false ? undefined : fileCache.get(url);
  if (cached !== undefined) {
    return cached;
  }
  const text = await fetchText(url, init);
  fileCache.set(url, text);
  return text;
}

/**
 * The compiler plugin that reads imports over HTTP. The Less plugin resolves an
 * `@import` to candidate paths against the importing source's path; this
 * locates the first one the server has and hands its text back as the source.
 * @param {Record<string, any>} options
 * @param {RequestInit} [init]
 */
function fetchedFiles(options, init) {
  return {
    name: 'less-browser-fetch',
    /** @param {string[]} candidates */
    async locate(candidates) {
      for (const path of candidates) {
        if (await loadFile(path, options, init).then(() => true, () => false)) {
          return path;
        }
      }
      return null;
    },
    /** @param {string} path */
    async getSource(path) {
      return fileCache.get(path) ?? loadFile(path, options, init);
    }
  };
}

/**
 * @param {string} input
 * @param {Record<string, any>} options
 * @param {RequestInit} [fetchInit] how imports are fetched
 */
async function renderLess(input, options, fetchInit) {
  const { configOptions, filePath } = createLessOptions(options);
  configOptions.compile.plugins.unshift(fetchedFiles(options, fetchInit));
  // ponytail: fresh Compiler per call — no defaultPlugins hook, so no
  // node-modules import plugin and no @jesscss/plugin-js. A page renders a
  // handful of sources; a cache map is not worth the surface. `prepareSource`
  // adds `banner`, `globalVars` and `modifyVars` to the source, as in Node.
  const compiler = new Compiler(configOptions, { prepareSource: prepareLessRootSource });
  const result = await compiler.renderToResult(
    { source: input, filePath, language: 'less', extension: '.less' },
    { ...configOptions, suppressWarnings: true }
  );
  if (result.errors?.length) {
    throw createRenderError(result);
  }
  return mapRenderResult(result, options);
}

/**
 * Render Less source to CSS. Mirrors the Less 4.x API: `options` and `callback`
 * are both optional, `callback` may be passed as the second argument, and the
 * returned Promise resolves to a `{ css, warnings }` result. When a callback is
 * given it is invoked err-first and the Promise is still returned.
 *
 * `@import`s resolve against `options.filename` (a URL path), or the page.
 * @param {string} input Less source
 * @param {object|Function} [options] Less-style options (math, collapseNesting, plugins) — or the callback
 * @param {Function} [callback] err-first `(error, result)` callback
 * @returns {Promise<{ css: string, warnings?: unknown[] }>}
 */
function render(input, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const promise = renderLess(input, options || {});
  if (typeof callback === 'function') {
    promise.then((result) => callback(null, result), (error) => callback(error));
  }
  return promise;
}

const less = {
  version: versionArray,
  render,
};

if (typeof document !== 'undefined') {
  installPageApi(window, less);
}

/**
 * The `id` part Less 4 derived from a sheet URL.
 * @param {string} href
 */
function extractId(href) {
  return href.replace(/^[a-z-]+:\/+?[^/]+/, '')
    .replace(/[?&]livereload=\w+/, '')
    .replace(/^\//, '')
    .replace(/\.[a-zA-Z]+$/, '')
    .replace(/[^.\w-]+/g, '-')
    .replace(/\./g, ':');
}

/**
 * Copy an element's `data-*` attributes into `options`, JSON values parsed.
 * @param {Record<string, unknown>} options
 * @param {HTMLElement | null | undefined} tag
 */
function addDataAttr(options, tag) {
  for (const [name, value] of Object.entries(tag?.dataset ?? {})) {
    if (name === 'env' || name === 'dumpLineNumbers' || name === 'rootpath' || name === 'errorReporting') {
      options[name] = value;
    } else {
      try {
        options[name] = JSON.parse(value);
      } catch {
        // Not JSON: Less 4 ignored the attribute too.
      }
    }
  }
}

/**
 * The page half of the Less 4 browser API: compile the page's Less on load and
 * expose the methods that compile it again.
 * @param {Window & Record<string, any>} window
 * @param {Record<string, any>} less
 */
function installPageApi(window, less) {
  const document = window.document;
  const typePattern = /^text\/(x-)?less$/;

  // A `window.less` object set before this script holds the options, as in Less 4.
  /** @type {Record<string, any>} */
  const options = { ...window.less };
  addDataAttr(options, document.currentScript);
  options.isFileProtocol ??= /^(file|(chrome|safari)(-extension)?|resource|qrc|app):/.test(window.location.protocol);
  options.poll ||= options.isFileProtocol ? 1000 : 1500;
  options.env ||= ['127.0.0.1', '0.0.0.0', 'localhost'].includes(window.location.hostname)
    || window.location.port || options.isFileProtocol ? 'development' : 'production';
  options.onReady ??= true;
  // Less 4's `functions` option and `window.LESS_PLUGINS` are function plugins.
  const { functions } = options;
  delete options.functions;
  options.plugins = [
    ...options.plugins ?? [],
    ...window.LESS_PLUGINS ?? [],
    ...functions ? [{ install: (_less, _manager, registry) => registry.addMultiple(functions) }] : []
  ];

  /**
   * Insert or replace the `<style>` holding a sheet's CSS, right after the sheet.
   * @param {string} css
   * @param {HTMLLinkElement} sheet
   */
  function createCSS(css, sheet) {
    const id = `less:${sheet.title || extractId(sheet.href)}`;
    const old = document.getElementById(id);
    if (old?.textContent === css) {
      return;
    }
    const style = document.createElement('style');
    style.id = id;
    if (sheet.media) {
      style.media = sheet.media;
    }
    style.textContent = css;
    sheet.after(style);
    old?.remove();
  }

  /** @param {string} href */
  const errorId = (href) => `less-error-message:${extractId(href)}`;

  /**
   * Report a failed source as `errorReporting` says: an in-page box in
   * development (`'html'`, the default), the console, or a callback.
   * @param {any} error
   * @param {string} href
   */
  function reportError(error, href) {
    const mode = options.errorReporting;
    if (typeof mode === 'function') {
      mode('add', error, href);
      return;
    }
    const where = `${error.filename || href}${error.line ? ` on line ${error.line}, column ${error.column}` : ''}`;
    const message = `${error.type || 'Syntax'}Error: ${error.message} in ${where}`;
    if (mode === 'console') {
      console.error(message);
      return;
    }
    if (options.env !== 'development') {
      return;
    }
    const box = document.createElement('pre');
    box.id = errorId(href);
    box.className = 'less-error-message';
    box.style.cssText = 'font-family: Arial, sans-serif; border: 1px solid #e00; background-color: #eee;'
      + ' border-radius: 5px; color: #e00; padding: 15px; margin-bottom: 15px; white-space: pre-wrap';
    box.textContent = [message, ...error.extract ?? []].join('\n');
    const show = () => {
      document.getElementById(box.id)?.remove();
      document.body.prepend(box);
    };
    if (document.body) {
      show();
    } else {
      document.addEventListener('DOMContentLoaded', show, { once: true });
    }
  }

  /** @param {string} href */
  function clearError(href) {
    if (typeof options.errorReporting === 'function') {
      options.errorReporting('remove', href);
    } else {
      document.getElementById(errorId(href))?.remove();
    }
  }

  /**
   * Options for one source: the page's, the tag's own `data-*`, and the
   * source's URL path as `filename`, so its `@import`s resolve against it. A
   * source on another origin gets no `filename`: its imports resolve against
   * the page.
   * @param {string} url
   * @param {HTMLElement | undefined} tag
   * @param {Record<string, string> | undefined} modifyVars
   */
  function sourceOptions(url, tag, modifyVars) {
    const sourceOpts = { ...options };
    addDataAttr(sourceOpts, tag);
    const resolved = new URL(url, document.baseURI);
    if (resolved.origin === window.location.origin) {
      sourceOpts.filename = resolved.pathname;
    }
    if (modifyVars) {
      sourceOpts.modifyVars = modifyVars;
    }
    return sourceOpts;
  }

  /**
   * Compile every `<style type="text/less">` in place. A failure is reported,
   * and leaves that style as it was.
   * @param {Record<string, string>} [modifyVars]
   */
  function refreshStyles(modifyVars) {
    const styles = [...document.getElementsByTagName('style')].filter((style) => typePattern.test(style.type));
    return Promise.all(styles.map((style) =>
      renderLess(style.textContent || '', sourceOptions(document.location.href, undefined, modifyVars)).then((result) => {
        style.type = 'text/css';
        style.textContent = result.css;
      }, (error) => reportError(error, 'inline'))));
  }

  less.sheets = [];
  less.env = options.env;
  less.watchMode = false;

  less.registerStylesheetsImmediately = () => {
    less.sheets = [...document.getElementsByTagName('link')].filter((link) =>
      link.rel === 'stylesheet/less' || (/stylesheet/.test(link.rel) && typePattern.test(link.type)));
  };

  less.registerStylesheets = () => Promise.resolve(less.registerStylesheetsImmediately());

  /**
   * Compile the registered sheets again, and the inline `<style type="text/less">`.
   * `reload` fetches past the HTTP cache and, unless `clearFileCache` is
   * `false`, empties the file cache; `clearFileCache: true` empties it alone.
   * Resolves with Less 4's timing record once all of them are in the page;
   * rejects with the first failed sheet's error, after reporting it.
   * @param {boolean} [reload]
   * @param {Record<string, string>} [modifyVars]
   * @param {boolean} [clearFileCache]
   */
  less.refresh = (reload, modifyVars, clearFileCache) => {
    if ((reload || clearFileCache) && clearFileCache !== false) {
      fileCache.clear();
    }
    const startTime = new Date();
    const fetchInit = reload ? { cache: 'no-cache' } : undefined;
    const styles = refreshStyles(modifyVars);
    const sheets = Promise.all(less.sheets.map(async (sheet) => {
      try {
        const sheetOptions = sourceOptions(sheet.href, sheet, modifyVars);
        const source = await loadFile(sheet.href, sheetOptions, fetchInit);
        const { css } = await renderLess(source, sheetOptions, fetchInit);
        clearError(sheet.href);
        createCSS(css, sheet);
      } catch (error) {
        error.href = sheet.href;
        reportError(error, sheet.href);
        throw error;
      }
    }));
    return Promise.all([sheets, styles]).then(() => {
      const endTime = new Date();
      return { startTime, endTime, totalMilliseconds: endTime - startTime, sheets: less.sheets.length };
    });
  };

  less.modifyVars = (record) => less.refresh(true, record, false);
  less.refreshStyles = refreshStyles;

  /** @type {ReturnType<typeof setInterval> | undefined} */
  let watchTimer;
  less.watch = () => {
    if (!less.watchMode) {
      less.env = 'development';
      watchTimer = setInterval(() => less.refresh(true).catch(() => {}), options.poll);
    }
    less.watchMode = true;
    return true;
  };
  less.unwatch = () => {
    clearInterval(watchTimer);
    less.watchMode = false;
    return false;
  };

  if (options.onReady) {
    if (/!watch/.test(window.location.hash)) {
      less.watch();
    }
    // Hide the page until its Less is compiled, unless `async` asks not to.
    const hide = options.async ? undefined : document.createElement('style');
    if (hide) {
      hide.textContent = 'body { display: none !important }';
      document.head.appendChild(hide);
    }
    less.registerStylesheetsImmediately();
    const done = () => hide?.remove();
    less.pageLoadFinished = less.refresh(less.env === 'development').then(done, done);
  }
}

export default less;
export { render, versionArray as version };
