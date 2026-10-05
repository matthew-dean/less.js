# Less 5 (alpha) — feature status

Less 5 is a from-scratch compiler (the [Jess](https://github.com/jesscss/jess)
engine) behind the same `less.render(input, options)` / `lessc` interface Less 4
users know. The tables below compare Less 4 with the current Less 5 alpha —
what's implemented, what's still in progress, and what will **intentionally
not** be carried over (with the reason).

> **Status:** alpha, published under the npm `alpha` dist-tag
> (`npm install less@alpha`). APIs and output may still change. This page is kept
> honest by the `packages/less` alpha test suite — if a row here drifts from
> actual behavior, the suite fails.

The headline change: **Less 5 preserves your authored nesting by default** (it
emits nested CSS) instead of always flattening. Opt into flattened output with
`collapseNesting`.

**Legend:** ✅ supported · ⏳ in progress · ❌ not supported (by design) · ➖ not applicable

## Language & output

| Feature | Less 4 | Less 5 | Notes |
| --- | :---: | :---: | --- |
| Variables, mixins (guards, named args), operations, functions | ✅ | ✅ | The Less builtin function library is ported. |
| `:extend` | ✅ | ✅ | |
| Nested-rule output | ➖ | ✅ | Less 4 always flattened; Less 5 **preserves** authored nesting by default. |
| `collapseNesting` (flatten instead) | ➖ | ✅ | `false` (default) / `'native'` (specificity-faithful) / `'compact'`. |
| `@media` query merging | ✅ | ❌ | Less 5 emits nested `@media` instead of rewriting to `@media (a) and (b)`. Browsers have nested `@media` far longer than native *selector* nesting, so nested output is safe — and merging can blow up combinatorially (each nested query multiplies out). |
| Inline JavaScript (backticks) | ✅ | ❌ | Removed. Script modules are the planned replacement for computed values; they are tracked separately from stylesheet composition below. |
| IE `progid:` / `filter` hacks | ✅ | ❌ | Removed. |

## Options (`less.render` API)

| Feature | Less 4 | Less 5 | Notes |
| --- | :---: | :---: | --- |
| `math` modes | ✅ | ✅ | `always` / `parens-division` (default) / `parens`. |
| `unitMode` (formerly `strictUnits`) | ✅ | ✅ | `loose` / `preserve` (default) / `strict`. |
| `moduleMode` | ➖ | ✅ | `auto` (default): a file that uses `@use` or `@compose` is in modern mode, any other file is legacy and its Less built-in functions compute as in Less 4. `modern`: every file is in modern mode, where a built-in must be imported (`@use "#less";` then `@less.darken(red, 10%)`); an unimported call keeps its name and call shape, with its arguments still evaluated (`min(@a, 1px)` with `@a: 2px + 3px` prints `min(5px, 1px)`). |
| `compress` | ✅ | ✅ | Minified, but not byte-identical to Less 4 `-x` (nesting preserved by default). |
| Source maps (`sourceMap`) | ✅ | ✅ | Returns `result.map`; annotation, inline data URI, `outputSourceFiles`, and the `rootpath`/`basepath`/`url` path variants all supported. The annotation is written only for an explicit `sourceMapURL` or `sourceMapFilename` (or inline); Less 4 also derives one from `sourceMapOutputFilename` or the input filename. |
| URL rewriting (`rewriteUrls` / `rootpath` / `urlArgs`) | ✅ | ✅ | Rewrites `url(...)` references; the Less 4 `rewrite-urls-*` and `rootpath-rewrite-urls-*` fixtures render byte-identically. |
| `processImports` | ✅ | ✅ | `false` skips import processing: imported stylesheets are neither loaded nor kept as CSS `@import` statements. |
| `globalVars` / `modifyVars` injection | ✅ | ❌ | Not supported — these throw rather than silently no-op. |
| `javascriptEnabled` | ✅ | ❌ | JavaScript evaluation is not supported. |

## Plugins (`@plugin`)

| Feature | Less 4 | Less 5 | Notes |
| --- | :---: | :---: | --- |
| Function plugins (`functions.add`) | ✅ | ✅ | The common `@plugin` shape, through `@jesscss/plugin-less-compat`. The plugin script runs in `@jesscss/plugin-js` (a Deno runtime), an optional peer that a default install leaves out: `npm install less@alpha @jesscss/plugin-js@alpha`. Without it, `@plugin "./x.js"` fails to load. |
| npm-package imports | ✅ | ✅ | Native via `@jesscss/plugin-node-modules` (the `less-plugin-npm-import` case). |
| Visitor / tree-visitor ABI, full `less.tree` | ✅ | ❌ | Intentional — the Less 4 tree is not the Less 5 AST; a translation layer isn't worth it. |
| Pre-/post-processor hooks | ✅ | ❌ | Run PostCSS after Less; minification is native via `compress`. |
| File-manager hooks | ✅ | ❌ | The common case (npm import) is covered natively. |
| `@plugin (options)` + `registerPlugin` lifecycle | ✅ | ❌ | Deprecated Less 4 lifecycle; not built. |

## Imports, CLI & tooling

| Feature | Less 4 | Less 5 | Notes |
| --- | :---: | :---: | --- |
| Sibling / relative `@import` | ✅ | ✅ | |
| Remote (`http(s)`) imports | ✅ | ⏳ | In progress on Jess `feat/less-v5-completion`: off by default, enabled only through an explicit network allowlist. |
| `@compose` stylesheet modules | ➖ | ⏳ | In progress on Jess `feat/less-v5-completion`. Isolated, non-transitive modules with inferred or explicit namespaces, `as *`, and per-edge `with` or shared `set` configuration. See the [canonical Modules and Imports source](https://github.com/jesscss/jess/blob/dev/packages/docs/docs-content/docs/shared/02-Language/14-modules-and-imports.mdx). |
| `@use` / `@from` script and data modules | ➖ | ⏳ | `@use "#less";` (the Less built-in functions, as `@less.darken(…)`) works and puts the file in modern mode (see `moduleMode`). JavaScript, TypeScript and JSON modules are in progress on Jess `feat/less-v5-completion`. See the [canonical Modules and Imports source](https://github.com/jesscss/jess/blob/dev/packages/docs/docs-content/docs/shared/02-Language/14-modules-and-imports.mdx). |
| Browser build (`window.less`) | ✅ | ⏳ | `dist/less-browser-dev.js` ships and powers the playground; Less 4 browser-API parity is in progress on Jess `feat/less-v5-completion`. |
| `lessc` CLI (compile) | ✅ | ✅ | Compiles files. |
| `lessc` CLI **flags** for the newer options | ✅ | ✅ | `--compress`/`-x`, `--source-map[=file]` (+ `--source-map-inline` / `-include-source` / `-rootpath` / `-basepath` / `-url`), `--rewrite-urls` / `--rootpath` / `--url-args`, `--math`, `--unit-mode`, `--module-mode` are all wired. |
| Diagnostics (`file:line:column` + excerpt) | ➖ | ✅ | Precise diagnostics, not raw parser offsets. |

---

*Found a row that contradicts actual behavior? Please open an issue — a drift
between this page and the compiler is a bug.*
