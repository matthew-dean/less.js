/**
 * The browser build in a real browser (headless Chrome via Playwright), served
 * with a Content-Security-Policy whose `script-src` omits 'unsafe-eval', the way
 * a strict page serves it. Checks the Less 4.x browser API the bundle exposes:
 *
 * - `<link rel="stylesheet/less">` and `<style type="text/less">` compile on
 *   load, `@import`s are fetched relative to the importing sheet, and
 *   `less.pageLoadFinished` settles once the CSS is in the page;
 * - `less.render()` returns a Promise and calls an err-first callback, with the
 *   options argument omissible;
 * - `less.refresh()` resolves with the timing record; a broken sheet is reported
 *   in the page and rejects `refresh()`;
 * - `less.modifyVars()` recompiles the sheets with the variables given;
 * - nothing violates the policy, and load plus first render stay inside an
 *   absolute budget.
 *
 * Needs `dist/less-browser-dev.js` (`npm run build:browser`) and a Chrome
 * install (Playwright's `chrome` channel).
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const bundle = readFileSync(fileURLToPath(new URL('../dist/less-browser-dev.js', import.meta.url)));

/*
 * Load plus first render, through the compiled grammar this bundle carries: about
 * 120 ms on a laptop. The budget leaves room for a slower CI runner and still
 * fails a multi-fold regression, such as the interpreter grammar whose runtime
 * compose() took 2.8 s.
 */
const BUDGET_MS = 500;

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";

/** @type {Record<string, [string, string]>} path -> [content type, body] */
const files = {
  '/less.js': ['text/javascript', bundle],
  '/watch-csp.js': ['text/javascript', `
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__violations.push(e.violatedDirective + ' ' + e.blockedURI));
    window.__t0 = performance.now();`],
  '/after-load.js': ['text/javascript', 'window.__loaded = performance.now();'],
  '/index.html': ['text/html', `<!doctype html><html><head><meta charset="utf-8">
    <script src="/watch-csp.js"></script>
    <link rel="stylesheet/less" href="/styles/main.less">
    <style type="text/less">@w: 3px; .inline { border-width: (@w * 2); border-style: solid; }</style>
    <script src="/less.js" data-env="development"></script>
    <script src="/after-load.js"></script>
    </head><body><div class="box"></div><div class="inline"></div></body></html>`],
  '/broken.html': ['text/html', `<!doctype html><html><head><meta charset="utf-8">
    <link rel="stylesheet/less" href="/styles/broken.less">
    <script src="/less.js" data-env="development"></script>
    </head><body><p>page</p></body></html>`],
  '/styles/main.less': ['text/plain', '@import "partials/colors";\n.box { color: @brand; width: (10px * 2); }\n'],
  '/styles/partials/colors.less': ['text/plain', '@brand: #ff0000;\n'],
  '/styles/broken.less': ['text/plain', '.a { color: @nope; }\n'],
};

/** @type {Record<string, number>} path -> requests served */
const hits = {};

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  hits[path] = (hits[path] ?? 0) + 1;
  const file = files[path];
  if (!file) {
    res.writeHead(404, { 'Content-Security-Policy': CSP });
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': file[0], 'Content-Security-Policy': CSP });
  res.end(file[1]);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto(`${origin}/index.html`);
  const loaded = await page.evaluate(async () => {
    await window.less.pageLoadFinished;
    const done = performance.now();
    const box = getComputedStyle(document.querySelector('.box'));
    const inline = getComputedStyle(document.querySelector('.inline'));
    return {
      violations: window.__violations,
      loadMs: window.__loaded - window.__t0,
      firstCssMs: done - window.__t0,
      color: box.color,
      width: box.width,
      borderWidth: inline.borderTopWidth,
      styleId: document.querySelector('link[rel="stylesheet/less"]').nextElementSibling?.id,
      bodyShown: getComputedStyle(document.body).display !== 'none',
    };
  });
  console.log(`  load ${loaded.loadMs.toFixed(0)} ms, first CSS in the page ${loaded.firstCssMs.toFixed(0)} ms`);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(loaded.violations, [], 'the bundle needs no unsafe-eval');
  assert.equal(loaded.color, 'rgb(255, 0, 0)', 'the imported variable reached the sheet');
  assert.equal(loaded.width, '20px');
  assert.equal(loaded.borderWidth, '6px', '<style type="text/less"> compiled in place');
  assert.equal(loaded.styleId, 'less:styles-main', 'the CSS follows its link, under Less 4\'s id');
  assert.ok(loaded.bodyShown, 'the page is shown again once compiled');
  assert.ok(loaded.firstCssMs < BUDGET_MS, `load plus first render took ${loaded.firstCssMs.toFixed(0)} ms (budget ${BUDGET_MS} ms)`);

  const api = await page.evaluate(async () => {
    const less = window.less;
    const viaPromise = await less.render('.a { width: (1px + 2); }');
    const viaCallback = await new Promise((resolve) => less.render('.b { c: d }', (error, result) => resolve({ error, css: result?.css })));
    const failed = await new Promise((resolve) => less.render('.a {', {}, (error) => resolve(error?.message)));
    const refreshed = await less.refresh();
    const modifyVars = await less.modifyVars({ brand: 'blue' }).then(() => 'resolved', (error) => error.message);
    const modifiedColor = getComputedStyle(document.querySelector('.box')).color;
    await less.refresh();
    const refreshedColor = getComputedStyle(document.querySelector('.box')).color;
    return {
      version: less.version,
      css: viaPromise.css,
      viaCallback,
      failed: typeof failed,
      refreshed: { sheets: refreshed.sheets, ms: typeof refreshed.totalMilliseconds },
      modifyVars,
      modifiedColor,
      refreshedColor,
      surface: Object.keys(less).sort(),
    };
  });
  assert.ok(Array.isArray(api.version) && api.version[0] === 5, 'version is the [major, minor, patch] array');
  assert.match(api.css, /width: 3px/);
  assert.deepEqual(api.viaCallback, { error: null, css: '.b {\n  c: d;\n}\n' });
  assert.equal(api.failed, 'string', 'a syntax error reaches the callback');
  assert.deepEqual(api.refreshed, { sheets: 1, ms: 'number' });
  assert.equal(api.modifyVars, 'resolved');
  assert.equal(api.modifiedColor, 'rgb(0, 0, 255)', 'modifyVars() recompiles the sheets with the variables given');
  assert.equal(api.refreshedColor, 'rgb(255, 0, 0)', 'a later refresh() compiles them as written again, as in Less 4');
  assert.deepEqual(api.surface, [
    'env', 'modifyVars', 'pageLoadFinished', 'refresh', 'refreshStyles', 'registerStylesheets',
    'registerStylesheetsImmediately', 'render', 'sheets', 'unwatch', 'version', 'watch', 'watchMode',
  ]);

  // Less 4's file cache (`useFileCache`, on by default): refresh() and
  // modifyVars() reuse fetched files, render() shares them, refresh(true)
  // fetches again.
  const fetched = () => ({ main: hits['/styles/main.less'], colors: hits['/styles/partials/colors.less'] });
  assert.deepEqual(fetched(), { main: 1, colors: 1 }, 'refresh() and modifyVars() read the file cache');
  const importColors = '@import "/styles/partials/colors.less";\n.x { color: @brand; }';
  await page.evaluate((source) => window.less.render(source), importColors);
  assert.equal(fetched().colors, 1, 'render() reads the same file cache');
  await page.evaluate((source) => window.less.render(source, { useFileCache: false }), importColors);
  assert.equal(fetched().colors, 2, 'useFileCache: false fetches again');
  await page.evaluate(() => window.less.refresh(true));
  assert.deepEqual(fetched(), { main: 2, colors: 3 }, 'refresh(true) empties the file cache');

  const broken = await browser.newPage();
  await broken.goto(`${origin}/broken.html`);
  const report = await broken.evaluate(async () => {
    await window.less.pageLoadFinished;
    const refresh = await window.less.refresh().then(() => 'resolved', (error) => error.href);
    return { box: document.querySelector('.less-error-message')?.textContent, refresh };
  });
  assert.match(report.box ?? '', /broken\.less/, 'the error is shown in the page in development');
  assert.match(report.refresh, /\/styles\/broken\.less$/, 'refresh() rejects with the failing sheet');
} finally {
  await browser.close();
  server.close();
}

console.log('alpha-browser: ok');
