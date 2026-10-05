<p align="center"><img src="http://lesscss.org/public/img/less_logo.png" width="264" height="117" alt="Less.js logo"></p>

<p align="center">
    <a href="https://github.com/less/less.js/actions?query=branch%3Amaster"><img src="https://github.com/less/less.js/actions/workflows/ci.yml/badge.svg?branch=master" alt="Github Actions CI"/></a>
    <a href="https://www.npmtrends.com/less"><img src="https://img.shields.io/npm/dm/less.svg?sanitize=true" alt="Downloads"></a>
    <a href="https://www.npmjs.com/package/less"><img src="https://img.shields.io/npm/v/less.svg?sanitize=true" alt="npm version" /></a>
</p>

# Less.js

> The dynamic stylesheet language. [lesscss.org](http://lesscss.org)

> [!IMPORTANT]
> This package README is for Less 5 alpha.1. Less 5 is a Jess-powered compiler
> preview for early testing and is not yet a drop-in replacement for Less 4.x.
> It covers Node.js `less.render()`, `less.renderFile()`, and `lessc`, plus
> variables, arithmetic, mixins, imports, and nested-rule output. Source maps,
> URL rewriting, and `compress` now work through the `less.render()` API; the
> legacy `@plugin` hook ABI is intentionally not carried over (function plugins
> are supported). See the **[Less 5 feature status](V5-STATUS.md)** for the full
> list of what is implemented, in progress, and intentionally not.

Less extends CSS with variables, mixins, functions, nesting, and more — then compiles to standard CSS. Write cleaner stylesheets with less code.

```less
@primary: #4a90d9;

.button {
  color: @primary;
  &:hover {
    color: darken(@primary, 10%);
  }
}
```

## Install

```sh
npm install less@alpha
```

Function `@plugin` scripts run in the optional `@jesscss/plugin-js` runtime,
which a default install leaves out. To use them, install it alongside:

```sh
npm install less@alpha @jesscss/plugin-js@alpha
```

Unlike Less 4, a plugin script runs sandboxed: it can read only files under the
project root (the directory of the `styles.config.*` above the entry file, or
the entry file's own directory), and by default it has no environment or
network access. To load a plugin from elsewhere, set `compile.jsReadRoot` in a
`styles.config.*` to an absolute path.

For a pinned first alpha:

```sh
npm install less@5.0.0-alpha.1
```

## Usage

### Node.js

Less 5 alpha.1 requires Node.js `^20.19.0 || >=22.12.0`.

```js
import less from 'less';

const output = await less.render('.class { width: (1 + 1) }');
console.log(output.css);
```

### Command Line

```sh
npx lessc styles.less styles.css
```

### Browser

A browser build ships in the package (`dist/less-browser-dev.js`) and defines
`window.less` with the Less 4 browser API: it compiles the page's
`<link rel="stylesheet/less">` and `<style type="text/less">` on load, and
`less.render()`, `less.refresh()` and `less.watch()` work as before. It runs
under a Content-Security-Policy without `'unsafe-eval'`. See the
[feature status](V5-STATUS.md) for what is not carried over.

## Why Less?

- **Variables** — define reusable values once
- **Mixins** — reuse groups of declarations across rulesets
- **Nesting** — mirror HTML structure in your stylesheets
- **Functions** — transform colors, manipulate strings, do math
- **Imports** — split stylesheets into manageable pieces
- **Extend** — reduce output size by combining selectors

## Documentation

Full documentation, usage guides, and configuration options at **[lesscss.org](http://lesscss.org)**.

## Contributing

Less.js is open source. [Report bugs](https://github.com/less/less.js/issues), submit pull requests, or help improve the [documentation](https://github.com/less/less-docs).

See [CONTRIBUTING.md](https://github.com/less/less.js/blob/master/CONTRIBUTING.md) for development setup.

## License

Copyright (c) 2009-2025 [Alexis Sellier](http://cloudhead.io) & The Core Less Team
Licensed under the [Apache License](https://github.com/less/less.js/blob/master/LICENSE).
