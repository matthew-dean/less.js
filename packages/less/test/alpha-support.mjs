import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import less from '../lib/index.js';
import { render as renderInBrowser } from '../lib/browser-dev.js';

const testDataRoot = path.resolve(packageRoot(), '..', 'test-data', 'tests-unit');

// Options that must reject (assertUnsupportedApiOptionsReject) and the key
// options that must work (assertOutputApiOptionsSupported). V5-STATUS.md is kept
// honest against these: assertStatusDocInSync asserts each supported option is
// documented under "Implemented" and each rejected one under "Intentionally
// not", so a support change that doesn't update the public status page — or that
// files an option under the wrong heading — fails the suite.
const REJECTED_OPTIONS = ['javascriptEnabled'];
const SUPPORTED_OPTIONS = [
    'collapseNesting', 'sourceMap', 'compress', 'rewriteUrls', 'urlArgs', 'rootpath', 'unitMode', 'math',
    'strictMath', 'moduleMode', 'processImports', 'globalVars', 'modifyVars', 'banner'
];

const unsupportedForAlpha1 = [
    {
        area: 'Legacy plugin host APIs',
        detail: 'Less @plugin, render-option function plugins, file-manager plugins, and pre/post-processors are wired for future compatibility but are not alpha.1-supported execution paths.'
    },
    {
        area: 'Remote (network) imports',
        detail: 'Importing from http(s) URLs is gated behind an explicit network policy and is not enabled by default.'
    },
    {
        area: 'Compression/minification parity',
        detail: 'compress is supported, but output is not byte-identical to the Less 4 `-x` minifier — v5 preserves authored nesting by default (collapseNesting).'
    },
    {
        area: 'Permissive legacy syntax edge cases',
        detail: 'Removed/deprecated syntax such as dynamic @charset and other permissive parser corners must reject with precise diagnostics.'
    },
    {
        area: 'Browser/Sauce harness',
        detail: 'The browser harness is not an alpha.1 publish gate.'
    }
];

function packageRoot() {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function printUnsupportedInventory() {
    console.log('\nLess 5 alpha.1 unsupported inventory:');
    for (const entry of unsupportedForAlpha1) {
        console.log(`- ${entry.area}: ${entry.detail}`);
    }
}

async function assertFixtureRendersByteIdentical(fixturePath) {
    const sourcePath = path.join(testDataRoot, `${fixturePath}.less`);
    const expectedPath = path.join(testDataRoot, `${fixturePath}.css`);
    const [result, expected] = await Promise.all([
        less.renderFile(sourcePath, { paths: [path.dirname(sourcePath)] }),
        readFile(expectedPath, 'utf8')
    ]);
    assert.equal(result.css, expected, `${fixturePath} should render byte-identically`);
}

async function assertSupportedCompileSurface() {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'less-alpha-support-'));
    try {
        const imported = path.join(tempDir, 'tokens.less');
        const entry = path.join(tempDir, 'entry.less');

        await writeFile(imported, [
            '@accent: blue;',
            '.token() { border-color: @accent; }',
            ''
        ].join('\n'));
        await writeFile(entry, [
            '@import "tokens.less";',
            '@width: 1 + 1;',
            '.box {',
            '  width: @width;',
            '  .token();',
            '  &:hover { color: red; }',
            '}',
            ''
        ].join('\n'));

        const result = await less.renderFile(entry, { collapseNesting: true });
        assert.equal(result.css, `.box {
  width: 2;
  border-color: blue;
}
.box:hover {
  color: red;
}
`);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

async function assertUnsupportedSyntaxHasPreciseDiagnostic() {
    const stderrWrites = [];
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = function captureStderr(chunk, ...args) {
        stderrWrites.push(String(chunk));
        if (typeof args.at(-1) === 'function') {
            args.at(-1)();
        }
        return true;
    };
    try {
        await assert.rejects(
            less.render('@Eight: 8;\n@charset "UTF-@{Eight}";\n', {
                filename: 'alpha-unsupported.less'
            }),
            error => {
                assert.equal(error.type, 'parse');
                assert.equal(error.filename, 'alpha-unsupported.less');
                assert.equal(error.line, 2);
                assert.equal(error.column, 1);
                assert.deepEqual(error.extract, [
                    '@Eight: 8;',
                    '@charset "UTF-@{Eight}";',
                    ''
                ]);
                assert.equal(error.jessErrors?.[0]?.code, 'parse/dynamic-charset');
                assert.equal(error.jessErrors?.[0]?.message, error.message);
                assert.equal(String(error), 'Error: Interpolation is not valid in @charset.');
                assert.doesNotMatch(String(error), /offset/i);
                return true;
            }
        );
    } finally {
        process.stderr.write = originalStderrWrite;
    }
    assert.equal(stderrWrites.join(''), '',
        'programmatic less.render() failures must not print diagnostics before the caller handles the rejection');
}

async function assertBareStructuralAtRuleVariablesReject() {
    await assert.rejects(
        less.render('@varfoo: foo;\n@container @varfoo (min-width: 400px) { .x { color: red; } }\n', {
            filename: 'bare-at-rule-var.less'
        }),
        error => {
            assert.equal(error.type, 'parse');
            assert.equal(error.filename, 'bare-at-rule-var.less');
            assert.equal(error.line, 2);
            assert.equal(error.column, 12);
            assert.deepEqual(error.extract, [
                '@varfoo: foo;',
                '@container @varfoo (min-width: 400px) { .x { color: red; } }',
                ''
            ]);
            assert.doesNotMatch(String(error), /offset/i);
            return true;
        }
    );
}

async function assertStatusDocInSync() {
    const doc = await readFile(path.join(packageRoot(), 'V5-STATUS.md'), 'utf8');
    // Parse the comparison tables: | Feature | Less 4 | Less 5 | Notes |. Skip the
    // header/separator rows (a separator's Less-5 cell has no status icon).
    const rows = doc.split('\n')
        .filter(line => line.trimStart().startsWith('|'))
        .map(line => line.split('|').map(cell => cell.trim()))
        .filter(cells => cells.length >= 5)
        .map(cells => ({ feature: cells[1], less5: cells[3] }));

    // An option is documented iff some row names it in the Feature column and its
    // Less 5 cell carries the expected status icon.
    const documentedAs = (option, icon) =>
        rows.some(r => r.feature.includes(option) && r.less5.includes(icon));

    for (const option of SUPPORTED_OPTIONS) {
        assert.ok(documentedAs(option, '✅'),
            `V5-STATUS.md must show '${option}' as ✅ supported (public status drifted from the wrapper)`);
    }
    for (const option of REJECTED_OPTIONS) {
        assert.ok(documentedAs(option, '❌'),
            `V5-STATUS.md must show '${option}' as ❌ not supported (public status drifted from the wrapper)`);
    }
}

async function assertUnsupportedApiOptionsReject() {
    for (const option of REJECTED_OPTIONS) {
        await assert.rejects(
            less.render('.x { color: red; }\n', { [option]: true }),
            error => {
                assert.match(error.message, /not supported/);
                assert.match(error.message, new RegExp(option));
                return true;
            },
            `${option} must reject instead of silently no-oping`
        );
    }
}

async function assertOutputApiOptionsSupported() {
    const source = '.x { color: red; background: url("img/a.png"); .y { width: (1 + 1) } }\n';

    // Source maps: `sourceMap: true` returns a v3 map (Less 4.x `result.map`).
    const sm = await less.render(source, { sourceMap: true });
    assert.ok(sm.map, 'sourceMap: true must return result.map');
    const map = JSON.parse(sm.map);
    assert.equal(map.version, 3, 'source map must be v3');
    assert.ok(Array.isArray(map.sources) && map.sources.length > 0, 'source map must carry sources');

    // Compression: whitespace-stripped output.
    const cz = await less.render(source, { compress: true });
    assert.doesNotMatch(cz.css, /\n/, 'compress: true must strip newlines');
    assert.match(cz.css, /color:red/, 'compress: true must minify declarations');

    // URL rewriting (on the Less plugin): urlArgs appends, rootpath prepends.
    const ua = await less.render(source, { urlArgs: 'v=1' });
    assert.match(ua.css, /url\("img\/a\.png\?v=1"\)/, 'urlArgs must append the query');
    const rp = await less.render(source, { rootpath: '/cdn/' });
    assert.match(rp.css, /url\("\/cdn\/img\/a\.png"\)/, 'rootpath must prepend the path');
}

async function assertVariableInjectionSupported() {
    // As in Less 4.x: `globalVars` go ahead of the entry file, so the file can
    // override them; `modifyVars` go after it, so they override the file; a
    // name may carry its `@`. `banner` is printed ahead of the output.
    const source = '.x { a: @g; b: @m; c: @f; }\n@m: file;\n@f: file;\n';
    const options = {
        banner: '/* banner */\n',
        globalVars: { g: 'global', '@f': 'global' },
        modifyVars: { m: 'modified' }
    };
    const expected = '/* banner */\n.x {\n  a: global;\n  b: modified;\n  c: file;\n}\n';
    assert.equal((await less.render(source, options)).css, expected);
    assert.equal((await renderInBrowser(source, options)).css, expected,
        'the browser build applies them as the Node build does');
    await assert.rejects(less.render('.x { a: @g; }\n'), /not found/i,
        'a global variable exists only for the render that passes it');
}

async function assertBrowserBuildHonoursLessOptions() {
    // The browser build rebuilds the Less plugin from the render options as the
    // Node build does, so the plugin's own options (URL rewriting, moduleMode)
    // apply there too.
    const url = '.x { b: url("img/a.png"); }\n';
    const cases = [
        [url, { rootpath: '/cdn/' }, 'url("/cdn/img/a.png")'],
        [url, { urlArgs: 'v=1' }, 'url("img/a.png?v=1")'],
        ['.x { c: darken(red, 10%); }\n', { moduleMode: 'modern' }, 'darken(red, 10%)'],
    ];
    for (const [source, options, text] of cases) {
        const css = (await renderInBrowser(source, options)).css;
        assert.ok(css.includes(text), `the browser build honours ${JSON.stringify(options)}; got ${JSON.stringify(css)}`);
        assert.equal(css, (await less.render(source, options)).css, `browser and Node agree on ${JSON.stringify(options)}`);
    }
}

async function assertUnitModeSupported() {
    const source = '.x { width: 1px + 3em; }\n';
    // `unitMode` is the option; `strictUnits` is its deprecated boolean alias.
    for (const options of [{ unitMode: 'strict' }, { strictUnits: true }]) {
        await assert.rejects(
            less.render(source, options),
            error => {
                assert.match(error.message, /unit/i);
                return true;
            },
            `${JSON.stringify(options)} must reject incompatible units`
        );
    }
    // `unitMode: 'loose'` is the only way to select the Less 4.x fold.
    const loose = await less.render(source, { unitMode: 'loose' });
    assert.match(loose.css, /width: 4px/, 'unitMode: loose must fold');
    // The deprecated `strictUnits: false` means "not strict" — the default — and
    // warns; it never selects the fold. (Asserted as identity with the default so
    // the check holds across the pinned Jess's default-mode behavior.)
    const warnings = [];
    const listener = { warn(msg) { warnings.push(String(msg)); } };
    less.logger.addListener(listener);
    try {
        const [dflt, off] = await Promise.all([
            less.render(source, {}),
            less.render(source, { strictUnits: false })
        ]);
        assert.equal(off.css, dflt.css, 'strictUnits: false must render exactly as the default');
    } finally {
        less.logger.removeListener(listener);
    }
    assert.ok(
        warnings.some(w => /strictUnits is deprecated.*unitMode: 'preserve'/.test(w)),
        `strictUnits: false must warn with the mapping; got ${JSON.stringify(warnings)}`
    );
}

async function assertMathOptionSupported() {
    const source = '.x { width: 2 + 3; }\n';
    const parens = (await less.render(source, { math: 'parens' })).css;
    assert.match(parens, /width: 2 \+ 3;/, "math: 'parens' requires parens");
    // `strictMath` is the deprecated Less 4.x boolean alias of `math`: true is
    // 'parens', false the default; an explicit `math` wins. Any use warns.
    const warnings = [];
    const listener = { warn(msg) { warnings.push(String(msg)); } };
    less.logger.addListener(listener);
    try {
        assert.equal((await less.render(source, { strictMath: true })).css, parens, "strictMath: true is math: 'parens'");
        assert.equal((await less.render(source, { strictMath: false })).css, (await less.render(source)).css,
            'strictMath: false is the default math');
        assert.equal((await less.render(source, { strictMath: 1 })).css, parens,
            "any truthy strictMath is math: 'parens', as in Less 4.x");
        assert.match((await less.render(source, { strictMath: true, math: 'always' })).css, /width: 5;/,
            'an explicit math wins over strictMath');
    } finally {
        less.logger.removeListener(listener);
    }
    assert.deepEqual(warnings, [
        "strictMath is deprecated; use math. strictMath: true now means math: 'parens'",
        "strictMath is deprecated; use math. strictMath: false now means no math option (the default is 'parens-division')",
        "strictMath is deprecated; use math. strictMath: 1 now means math: 'parens'"
    ]);
    await assert.rejects(less.render(source, { math: 'alwys' }), /math must be 'always', 'parens-division', 'parens' or 'strict'/,
        'an unknown math value rejects instead of selecting another mode');
}

async function assertDumpLineNumbersIgnored() {
    // Less 4.x `dumpLineNumbers` is accepted and has no effect; the result
    // carries a deprecation warning saying so.
    const source = '.x { width: 2 + 3; }\n';
    const result = await less.render(source, { dumpLineNumbers: 'comments' });
    assert.equal(result.css, (await less.render(source)).css, 'dumpLineNumbers changes nothing in the CSS');
    assert.ok(result.warnings?.some(warning => warning.code === 'deprecation/dump-line-numbers-option'),
        `dumpLineNumbers must warn; got ${JSON.stringify(result.warnings?.map(warning => warning.code))}`);
}

async function assertModuleModeSupported() {
    const source = '.x { padding: min(-5px, 1px); color: darken(red, 10%); }\n';
    // 'auto' (the default): a file with no @use/@compose is legacy, so the Less
    // built-ins are ambient and compute.
    for (const options of [{}, { moduleMode: 'auto' }]) {
        assert.equal((await less.render(source, options)).css,
            '.x {\n  padding: -5px;\n  color: #cc0000;\n}\n',
            `${JSON.stringify(options)} computes Less built-ins in a legacy file`);
    }
    // 'modern': every file is modern. An unimported built-in keeps its name and
    // call shape, with its arguments evaluated; an imported one computes.
    assert.equal(
        (await less.render('@a: 2px + 3px;\n.x { padding: min(@a, 1px); color: darken(red, 10%); }\n', { moduleMode: 'modern' })).css,
        '.x {\n  padding: min(5px, 1px);\n  color: darken(red, 10%);\n}\n',
        "moduleMode: 'modern' keeps an unimported built-in's call shape and evaluates its arguments");
    assert.equal(
        (await less.render('@use "#less";\n.x { color: @less.darken(red, 10%); }\n', { moduleMode: 'modern' })).css,
        '.x {\n  color: #cc0000;\n}\n',
        "moduleMode: 'modern' still computes an imported built-in");
}

await assertSupportedCompileSurface();
await assertUnsupportedSyntaxHasPreciseDiagnostic();
await assertBareStructuralAtRuleVariablesReject();
await assertUnsupportedApiOptionsReject();
await assertOutputApiOptionsSupported();
await assertStatusDocInSync();
await assertVariableInjectionSupported();
await assertBrowserBuildHonoursLessOptions();
await assertUnitModeSupported();
await assertMathOptionSupported();
await assertDumpLineNumbersIgnored();
await assertModuleModeSupported();
await assertFixtureRendersByteIdentical('at-rule-variable-interpolation/at-rule-variable-interpolation');
await assertFixtureRendersByteIdentical('color-functions/modern');
await assertFixtureRendersByteIdentical('math-css-vars/math-css-vars');
await assertFixtureRendersByteIdentical('mixins-guards/mixins-guards');
await assertFixtureRendersByteIdentical('mixins-named-args/mixins-named-args');
printUnsupportedInventory();

console.log('\nLess 5 alpha.1 support contract passed');
